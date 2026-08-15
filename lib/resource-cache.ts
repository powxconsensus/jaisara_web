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
export async function fetchOnce<T>(key: string, run: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const promise = run()
    .then((data) => {
      writeCache(key, data);
      return data;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

/** Called on sign-out. Account data must not survive the session. */
export function clearResourceCache(): void {
  entries.clear();
  inflight.clear();
  for (const [key, set] of listeners) {
    for (const listener of set) listener();
    if (set.size === 0) listeners.delete(key);
  }
}
