/**
 * A short-lived cache for GET responses, shared across components.
 *
 * The problem it solves is not bandwidth, it is the shimmer. Every screen
 * fetched on mount with `no-store` and no shared store, so navigating away and
 * back - or two components asking for the same thing - meant discarding data
 * that was seconds old and rendering skeletons while the identical bytes came
 * over the wire again. On a remote API that is half a second of the product
 * looking broken to show a number that had not changed.
 *
 * The policy is stale-while-revalidate:
 *
 *  - **Fresh** (under `STALE_MS`): serve the cache, ask for nothing. Clicking
 *    between two screens repeatedly costs no requests at all.
 *  - **Stale**: serve the cache *immediately* and refresh behind it. The
 *    numbers on screen are at most a minute old and are replaced without a
 *    skeleton, so nothing ever appears to be loading.
 *  - **Absent**: the existing behaviour, a skeleton and a fetch.
 *
 * ── Why memory and not `localStorage` ────────────────────────────────────────
 *
 * Everything cached here is somebody's account data: balances, claims, other
 * members' emails in the console. Persisting that to disk would leave it
 * readable after sign-out on a shared machine, and would outlive the session it
 * was authorised by. In memory it dies with the tab, and `clearResourceCache`
 * empties it the moment a session ends - which is the same reason the auth
 * provider remounts its subtree on sign-out.
 */

interface Entry {
  data: unknown;
  fetchedAt: number;
}

/** Older than this and a read triggers a background refresh. */
export const STALE_MS = 60_000;

const entries = new Map<string, Entry>();
const listeners = new Map<string, Set<() => void>>();

/** In-flight requests, so two components mounting together make one call. */
const inflight = new Map<string, Promise<unknown>>();

/** The abort handle for each in-flight request, owned by the cache. */
const controllers = new Map<string, AbortController>();

/**
 * Which session the cache currently belongs to.
 *
 * Every entry here is somebody's account data, and cache keys are just paths -
 * `/api/claims|null|true` is the same key for every member alive. Clearing the
 * map on sign-out is not enough on its own: a request that was already in
 * flight resolves *afterwards* and writes the previous account's data back
 * under that shared key, where the next person to sign in on the same tab
 * reads it.
 *
 * So each request records the epoch it started in and refuses to write if the
 * session has moved on since. Bumping this is what makes a sign-out final.
 */
let epoch = 0;

export function readCache<T>(
  key: string,
): { data: T; stale: boolean; fetchedAt: number } | null {
  const entry = entries.get(key);
  if (!entry) return null;

  return {
    data: entry.data as T,
    stale: Date.now() - entry.fetchedAt >= STALE_MS,
    fetchedAt: entry.fetchedAt,
  };
}

export function writeCache(key: string, data: unknown): void {
  entries.set(key, { data, fetchedAt: Date.now() });
  for (const listener of listeners.get(key) ?? []) listener();
}

/**
 * Marks a key stale without dropping it.
 *
 * Used after a mutation: the next reader still gets something to render
 * instantly, and refreshes behind it. Dropping the entry instead would put the
 * skeleton back on exactly the screen somebody just acted on.
 */
export function invalidateAll(): void {
  for (const [key, entry] of entries) {
    entries.set(key, { ...entry, fetchedAt: 0 });
  }
}

export function subscribeToKey(key: string, onChange: () => void): () => void {
  const set = listeners.get(key) ?? new Set();
  set.add(onChange);
  listeners.set(key, set);

  return () => {
    set.delete(onChange);
    if (set.size === 0) listeners.delete(key);
  };
}

/**
 * Deduplicates concurrent requests for the same key.
 *
 * Two panels asking for the same list on the same mount is one request, not
 * two - which is most of what "the console fires six requests" was.
 */
export async function fetchOnce<T>(
  key: string,
  run: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  /**
   * The shared request gets its **own** abort handle.
   *
   * It used to inherit the signal of whichever component happened to call
   * first, which turned the deduplication into a liability: two panels showing
   * one list made a single request carrying only the first panel's signal, so
   * unmounting that panel aborted the request out from under the second one and
   * left it showing an error for data it had asked for and was still waiting
   * on. A shared request cannot belong to one subscriber.
   *
   * Nobody cancels it on unmount now. That is deliberate - the response still
   * lands in the cache, which is where the next mount reads it from, and a
   * subscriber that has gone away simply does not apply the result.
   */
  const controller = new AbortController();
  const startedAt = epoch;
  controllers.set(key, controller);

  const promise = run(controller.signal)
    .then((data) => {
      // A response from a session that has since ended must not repopulate the
      // cache the sign-out just emptied.
      if (startedAt === epoch) writeCache(key, data);
      return data;
    })
    .finally(() => {
      /**
       * Delete only what this call put there.
       *
       * An unconditional `delete(key)` is wrong whenever a *newer* request for
       * the same key already exists: the old promise settles, removes the new
       * entry, and the next subscriber makes a third request against a key that
       * is supposed to be deduplicated - and the new controller is dropped, so
       * the next sign-out has nothing left to abort.
       *
       * That is not hypothetical: it is the ordinary sequence when one account
       * signs out with a request in flight and another signs in on the same
       * tab, which is exactly the situation the epoch above exists for.
       */
      if (inflight.get(key) === promise) inflight.delete(key);
      if (controllers.get(key) === controller) controllers.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

/**
 * Called on sign-out. Account data must not survive the session.
 *
 * Three things, in this order, and the order is the point:
 *
 *  1. **Bump the epoch first.** Anything already in flight is now from a
 *     previous session and is refused at the write, whether or not the abort
 *     below reaches it in time. A fetch that has already resolved and is
 *     sitting in its `.then` cannot be aborted at all, which is exactly the
 *     gap that let the previous account's data reappear under a shared key.
 *  2. **Abort what can still be stopped**, so an outgoing request for one
 *     account is not still running while the next signs in.
 *  3. **Empty the maps.**
 */
export function clearResourceCache(): void {
  epoch += 1;

  for (const controller of controllers.values()) controller.abort();
  controllers.clear();

  entries.clear();
  inflight.clear();
  for (const [key, set] of listeners) {
    for (const listener of set) listener();
    if (set.size === 0) listeners.delete(key);
  }
}
