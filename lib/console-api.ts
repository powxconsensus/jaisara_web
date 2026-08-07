"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiErrorMessage } from "@/lib/auth-types";

/**
 * One way to talk to the admin API.
 *
 * Every console module needs the same four things — send JSON, read JSON,
 * turn a non-2xx into a message a human can act on, and drop the result if the
 * component unmounted first. Writing that per component is how three copies of
 * the same `.catch(() => setError("unavailable"))` drift apart.
 */

export class ConsoleApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ConsoleApiError";
  }

  /** The caller lacks the permission — worth saying so rather than "failed". */
  get isForbidden(): boolean {
    return this.status === 403;
  }
}

/** Thrown when the request never reached the API at all. */
const OFFLINE = "The service is unavailable. Please try again.";

export interface ConsoleRequest extends Omit<RequestInit, "body"> {
  /** Serialised as JSON unless it is already a FormData. */
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
}

export async function consoleApi<T>(path: string, init: ConsoleRequest = {}): Promise<T> {
  const { body, query, headers, ...rest } = init;
  const isForm = body instanceof FormData;

  let response: Response;
  try {
    response = await fetch(`${path}${buildQuery(query)}`, {
      cache: "no-store",
      ...rest,
      // FormData sets its own multipart boundary — overriding it breaks upload.
      headers: isForm ? headers : { "content-type": "application/json", ...headers },
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
  } catch {
    throw new ConsoleApiError(0, OFFLINE);
  }

  const payload = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    throw new ConsoleApiError(
      response.status,
      apiErrorMessage(payload, defaultMessage(response.status)),
    );
  }

  return payload as T;
}

function buildQuery(query: ConsoleRequest["query"]): string {
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
  /** Applies a local change without a round trip (optimistic updates). */
  set: (next: T | null) => void;
}

/**
 * Loads a GET resource and keeps it fresh.
 *
 * `enabled: false` is what makes search-first screens possible — the people
 * directory must not fetch the whole member base just because it mounted.
 */
export function useResource<T>(
  path: string | null,
  options: { query?: ConsoleRequest["query"]; enabled?: boolean } = {},
): Resource<T> {
  const { query, enabled = true } = options;

  // Serialised so a caller can pass an inline object without re-firing forever.
  const queryKey = JSON.stringify(query ?? null);
  const active = Boolean(path) && enabled;
  const requestKey = `${path ?? ""}|${queryKey}|${active}`;

  const [state, setState] = useState<ResourceState<T>>({
    data: null,
    error: null,
    loading: active,
  });

  // When the inputs change, clear the previous result *during render* rather
  // than in the effect. React's recommended alternative to a state-resetting
  // effect: it avoids the extra commit that would flash stale data first.
  const [lastKey, setLastKey] = useState(requestKey);
  if (lastKey !== requestKey) {
    setLastKey(requestKey);
    setState({ data: null, error: null, loading: active });
  }

  // The in-flight request, so a fast retype cancels the previous search rather
  // than racing it — an older, slower response must never overwrite a newer one.
  const inflight = useRef<AbortController | null>(null);

  const fetchInto = useCallback(
    async (controller: AbortController) => {
      if (!path) return;
      try {
        const data = await consoleApi<T>(path, {
          query: JSON.parse(queryKey) as ConsoleRequest["query"],
          signal: controller.signal,
        });
        if (!controller.signal.aborted) setState({ data, error: null, loading: false });
      } catch (error) {
        if (!controller.signal.aborted) {
          setState({ data: null, error: errorMessage(error), loading: false });
        }
      }
    },
    [path, queryKey],
  );

  const start = useCallback(() => {
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;
    return { controller, done: fetchInto(controller) };
  }, [fetchInto]);

  useEffect(() => {
    if (!active) return;
    // `start` kicks off a fetch. The rule follows the call graph into
    // `fetchInto` and sees a setState, but every one of those sits behind an
    // `await` — they run when the response lands, which is exactly the
    // "subscribe to an external system" case the rule is meant to allow. The
    // synchronous state reset it is guarding against is done during render
    // above instead.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    const { controller } = start();
    return () => controller.abort();
  }, [active, start]);

  const reload = useCallback(async () => {
    if (!active) return;
    setState((previous) => ({ ...previous, loading: true, error: null }));
    await start().done;
  }, [active, start]);

  return {
    ...state,
    reload,
    set: (next) => setState((previous) => ({ ...previous, data: next })),
  };
}

export interface PagedResource<T> {
  rows: T[];
  error: string | null;
  /** True while the first page is loading; `loadingMore` covers the rest. */
  loading: boolean;
  loadingMore: boolean;
  /** False once a page comes back short — that page was the last one. */
  hasMore: boolean;
  loadMore: () => void;
  reload: () => void;
}

/**
 * A list fetched a page at a time.
 *
 * For tables where "everything" is an unbounded number of rows — orders grow
 * with every import — pulling the lot on mount costs a slow query and a long
 * paint for data nobody scrolls to. Pages append as the sentinel comes into
 * view; changing a filter starts over from the first page.
 */
export function usePagedResource<T>(
  path: string,
  options: { query?: ConsoleRequest["query"]; pageSize?: number; enabled?: boolean } = {},
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
        const page = await consoleApi<T[]>(path, {
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
    async <T,>(path: string, init: ConsoleRequest = {}): Promise<T | null> => {
      setPending(true);
      setError(null);
      try {
        return await consoleApi<T>(path, { method: "POST", ...init });
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
