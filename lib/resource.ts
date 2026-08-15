"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiErrorMessage } from "@/lib/auth-types";
import { apiFetch } from "@/lib/api-fetch";
import {
  fetchOnce,
  invalidateAll,
  readCache,
  subscribeToKey,
  writeCache,
} from "@/lib/resource-cache";

/**
 * One way to read from the API, for the console and the member dashboard both.
 *
 * Every screen needs the same four things - send JSON, read JSON, turn a
 * non-2xx into a message a human can act on, and drop the result if the
 * component unmounted first. Writing that per component is how three copies of
 * the same `.catch(() => setError("unavailable"))` drift apart.
 *
 * This began as the console's own module and was moved here unchanged. The
 * member dashboard had been hand-rolling `useEffect` + `apiFetch` + `no-store`
 * per screen, which meant it fetched again on every single mount: opening the
 * claims page twice cost two round trips for an answer that had not changed,
 * and there was no way to ask for a fresh one short of reloading the page.
 * Nothing about that caching is admin-specific, so the name no longer is
 * either.
 */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** The caller lacks the permission - worth saying so rather than "failed". */
  get isForbidden(): boolean {
    return this.status === 403;
  }
}

/** Thrown when the request never reached the API at all. */
const OFFLINE = "The service is unavailable. Please try again.";

export interface JsonRequest extends Omit<RequestInit, "body"> {
  /** Serialised as JSON unless it is already a FormData. */
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
}

export async function requestJson<T>(path: string, init: JsonRequest = {}): Promise<T> {
  const { body, query, headers, ...rest } = init;
  const isForm = body instanceof FormData;

  let response: Response;
  try {
    response = await apiFetch(`${path}${buildQuery(query)}`, {
      cache: "no-store",
      ...rest,
      // FormData sets its own multipart boundary - overriding it breaks upload.
      headers: isForm ? headers : { "content-type": "application/json", ...headers },
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, OFFLINE);
  }

  const payload = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      apiErrorMessage(payload, defaultMessage(response.status)),
    );
  }

  return payload as T;
}

function buildQuery(query: JsonRequest["query"]): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const search = params.toString();
  return search ? `?${search}` : "";
}

function defaultMessage(status: number): string {
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You do not have permission to do that.";
  if (status === 404) return "That record no longer exists.";
  if (status === 409) return "That conflicts with something already recorded.";
  return "Something went wrong. Please try again.";
}

/** Narrows an unknown catch value to the message worth showing. */
export function errorMessage(error: unknown, fallback = OFFLINE): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

interface ResourceState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

export interface Resource<T> extends ResourceState<T> {
  /** Re-fetches and replaces the data; safe to call from an event handler. */
  reload: () => Promise<void>;
  /**
   * True while a refresh runs *behind* data that is already on screen.
   *
   * Distinct from `loading`, which means there is nothing to show yet. A
   * refresh button uses this to say it is working without the panel collapsing
   * into skeletons around it.
   */
  refreshing: boolean;
  /** When the data on screen was fetched, or null if it never was. */
  fetchedAt: number | null;
  /**
   * Applies a change without a round trip, for the response a mutation just
   * returned or a genuine optimistic update.
   *
   * Writes **through to the cache**, not just to local state. It used to do
   * only the latter, which was harmless until the cache existed and quietly
   * wrong afterwards: `useMutation` marks every entry stale on success, so a
   * caller that saved and then called `set` had the correct value on screen and
   * the superseded one in the cache - and the next mount painted the old value
   * before correcting itself. Passing `null` clears local state only, since
   * "I have nothing to show" is not a fact about the server.
   */
  set: (next: T | null) => void;
}

/**
 * Loads a GET resource and keeps it fresh.
 *
 * `enabled: false` is what makes search-first screens possible - the people
 * directory must not fetch the whole member base just because it mounted.
 */
export function useResource<T>(
  path: string | null,
  options: { query?: JsonRequest["query"]; enabled?: boolean } = {},
): Resource<T> {
  const { query, enabled = true } = options;

  // Serialised so a caller can pass an inline object without re-firing forever.
  const queryKey = JSON.stringify(query ?? null);
  const active = Boolean(path) && enabled;
  const requestKey = `${path ?? ""}|${queryKey}|${active}`;

  /**
   * Seeded from the cache, so a screen that has been open before renders its
   * numbers immediately rather than a skeleton it has already shown once.
   */
  const cached = active ? readCache<T>(requestKey) : null;

  const [state, setState] = useState<ResourceState<T>>({
    data: cached?.data ?? null,
    error: null,
    loading: active && !cached,
  });

  // When the inputs change, swap to whatever the cache holds for the *new* key
  // during render rather than in the effect. React's recommended alternative to
  // a state-resetting effect, and it is what stops a filter change blanking a
  // table that has the answer already.
  const [lastKey, setLastKey] = useState(requestKey);
  if (lastKey !== requestKey) {
    const next = active ? readCache<T>(requestKey) : null;
    setLastKey(requestKey);
    setState({ data: next?.data ?? null, error: null, loading: active && !next });
  }

  const [refreshing, setRefreshing] = useState(false);

  // The in-flight request, so a fast retype cancels the previous search rather
  // than racing it - an older, slower response must never overwrite a newer one.
  const inflight = useRef<AbortController | null>(null);

  const fetchInto = useCallback(
    async (controller: AbortController) => {
      if (!path) return;
      try {
        // Deduplicated by key, so two panels mounting together make one call.
        // The result is written to the cache for whoever asks next.
        const data = await fetchOnce<T>(requestKey, () =>
          requestJson<T>(path, {
            query: JSON.parse(queryKey) as JsonRequest["query"],
            signal: controller.signal,
          }),
        );
        if (!controller.signal.aborted) setState({ data, error: null, loading: false });
      } catch (error) {
        if (!controller.signal.aborted) {
          // Keeps whatever is already on screen. A failed *refresh* must not
          // replace good data with an error - the numbers are stale, not wrong,
          // and blanking a working screen because a background poll timed out
          // is worse than showing it a minute late.
          setState((previous) =>
            previous.data === null
              ? { data: null, error: errorMessage(error), loading: false }
              : { ...previous, loading: false },
          );
        }
      } finally {
        if (!controller.signal.aborted) setRefreshing(false);
      }
    },
    [path, queryKey, requestKey],
  );

  const start = useCallback(() => {
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;
    return { controller, done: fetchInto(controller) };
  }, [fetchInto]);

  useEffect(() => {
    if (!active) return;

    /**
     * Fresh enough to leave alone.
     *
     * This is what makes clicking between two console screens cost nothing:
     * within the window the answer on screen is the answer, and asking again
     * would only redraw the same number.
     */
    const entry = readCache<T>(requestKey);
    if (entry && !entry.stale) return;

    // `start` kicks off a fetch. The rule follows the call graph into
    // `fetchInto` and sees a setState, but every one of those sits behind an
    // `await` - they run when the response lands, which is exactly the
    // "subscribe to an external system" case the rule is meant to allow. The
    // synchronous state reset it is guarding against is done during render
    // above instead.
     
    const { controller } = start();
    return () => controller.abort();
  }, [active, requestKey, start]);

  // Another component refreshing the same key updates this one too, so two
  // panels showing one list cannot drift apart.
  useEffect(() => {
    if (!active) return;
    return subscribeToKey(requestKey, () => {
      const entry = readCache<T>(requestKey);
      if (entry) setState({ data: entry.data, error: null, loading: false });
    });
  }, [active, requestKey]);

  const reload = useCallback(async () => {
    if (!active) return;
    // Deliberately not `loading: true`. A manual refresh keeps the current
    // numbers on screen and reports itself through `refreshing`, so pressing it
    // never replaces a working panel with skeletons.
    setRefreshing(true);
    setState((previous) => ({ ...previous, error: null }));
    await start().done;
  }, [active, start]);

  return {
    ...state,
    reload,
    refreshing,
    fetchedAt: readCache<T>(requestKey)?.fetchedAt ?? null,
    set: (next) => {
      // Cache first, so every other component showing this key sees it too -
      // `writeCache` notifies them - and so the next mount does not paint the
      // value this one just replaced.
      if (next !== null && active) writeCache(requestKey, next);
      setState((previous) => ({ ...previous, data: next }));
    },
  };
}

export interface PagedResource<T> {
  rows: T[];
  error: string | null;
  /** True while the first page is loading; `loadingMore` covers the rest. */
  loading: boolean;
  loadingMore: boolean;
  /** False once a page comes back short - that page was the last one. */
  hasMore: boolean;
  loadMore: () => void;
  reload: () => void;
}

/**
 * A list fetched a page at a time.
 *
 * For tables where "everything" is an unbounded number of rows - orders grow
 * with every import - pulling the lot on mount costs a slow query and a long
 * paint for data nobody scrolls to. Pages append as the sentinel comes into
 * view; changing a filter starts over from the first page.
 */
export function usePagedResource<T>(
  path: string,
  options: { query?: JsonRequest["query"]; pageSize?: number; enabled?: boolean } = {},
): PagedResource<T> {
  const { query, pageSize = 50, enabled = true } = options;
  const queryKey = JSON.stringify(query ?? null);

  const [rows, setRows] = useState<T[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Reset during render when the filters change, so a stale page never shows
  // for a frame under the new filter.
  const [lastKey, setLastKey] = useState(queryKey);
  if (lastKey !== queryKey) {
    setLastKey(queryKey);
    setRows([]);
    setError(null);
    setHasMore(true);
    setLoading(enabled);
  }

  // Guards against the sentinel firing twice for the same page while a request
  // is already in flight.
  const fetching = useRef(false);
  const cursor = useRef(0);

  const fetchPage = useCallback(
    async (skip: number) => {
      if (fetching.current) return;
      fetching.current = true;
      try {
        const page = await requestJson<T[]>(path, {
          query: {
            ...(JSON.parse(queryKey) as Record<string, string | number | boolean | undefined>),
            take: pageSize,
            skip,
          },
        });
        setRows((previous) => (skip === 0 ? page : [...previous, ...page]));
        // A short page means the end. An exactly-full last page costs one more
        // request that comes back empty, which is the correct trade for not
        // needing a total count on every call.
        setHasMore(page.length === pageSize);
        cursor.current = skip + page.length;
        setError(null);
      } catch (caught) {
        setError(errorMessage(caught));
        setHasMore(false);
      } finally {
        fetching.current = false;
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [path, queryKey, pageSize],
  );

  useEffect(() => {
    if (!enabled) return;
    cursor.current = 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- every setState in `fetchPage` is behind an await; the synchronous reset is done during render above
    void fetchPage(0);
  }, [enabled, fetchPage]);

  return {
    rows,
    error,
    loading,
    loadingMore,
    hasMore,
    loadMore: () => {
      if (fetching.current || !hasMore || loading) return;
      setLoadingMore(true);
      void fetchPage(cursor.current);
    },
    reload: () => {
      cursor.current = 0;
      setLoading(true);
      void fetchPage(0);
    },
  };
}

/**
 * Runs a mutation, tracking pending state and surfacing the API's own message.
 *
 * Returns `null` on failure rather than throwing: every call site handled the
 * error the same way, and a thrown rejection in an `onClick` is an unhandled
 * promise nobody sees.
 */
export function useMutation() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async <T,>(path: string, init: JsonRequest = {}): Promise<T | null> => {
      setPending(true);
      setError(null);
      try {
        const result = await requestJson<T>(path, { method: "POST", ...init });

        /**
         * Everything cached is now suspect.
         *
         * Approving a claim moves a payout queue, a wallet, a member row and a
         * dashboard tile at once, and mapping those relationships here would be
         * a second copy of the API's own graph that goes wrong quietly. Marking
         * the lot stale is cheap because stale does not mean discarded: every
         * screen still renders instantly from what it has and refreshes behind
         * it. The cost of over-invalidating is one background request; the cost
         * of under-invalidating is somebody acting on a number that already
         * changed.
         */
        invalidateAll();
        return result;
      } catch (caught) {
        setError(errorMessage(caught));
        return null;
      } finally {
        setPending(false);
      }
    },
    [],
  );

  return { mutate, pending, error, setError };
}
