import { afterEach, describe, expect, it, vi } from "vitest";

import {
  clearResourceCache,
  fetchOnce,
  readCache,
  writeCache,
} from "./resource-cache";

/**
 * The cache holds account data under keys that are just paths.
 *
 * `/api/claims|null|true` is the same key for every member alive, so everything
 * that keeps one person's data from reaching the next person's screen lives in
 * this file. It had two defects that no test existed to catch, and both were
 * found by review rather than by the suite:
 *
 *  1. A request already in flight when a session ended resolved *afterwards*
 *     and wrote the previous account's data back under the shared key.
 *  2. The cleanup deleted map entries by key unconditionally, so a settling old
 *     request removed a *newer* request's promise and abort handle.
 *
 * These are the tests that should have existed first.
 */
describe("the resource cache", () => {
  afterEach(() => {
    clearResourceCache();
    vi.restoreAllMocks();
  });

  const deferred = <T,>() => {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((r) => {
      resolve = r;
    });
    return { promise, resolve };
  };

  it("serves what it stored", () => {
    writeCache("k", { total: 1 });

    expect(readCache<{ total: number }>("k")?.data).toEqual({ total: 1 });
  });

  it("deduplicates concurrent requests for one key", async () => {
    const gate = deferred<string>();
    const run = vi.fn().mockReturnValue(gate.promise);

    const first = fetchOnce("k", run);
    const second = fetchOnce("k", run);

    gate.resolve("value");
    await Promise.all([first, second]);

    expect(run).toHaveBeenCalledTimes(1);
  });

  it("refuses a write from a session that has already ended", async () => {
    /**
     * The cross-account leak. A request for account A is in flight, A signs
     * out, and the response lands afterwards. Without the epoch check it
     * repopulates the cache the sign-out just emptied, and B reads it.
     */
    const gate = deferred<string>();
    const inFlight = fetchOnce("k", () => gate.promise);

    clearResourceCache();

    gate.resolve("account A data");
    await inFlight;

    expect(readCache("k")).toBeNull();
  });

  it("does not let a settling old request evict a newer one", async () => {
    /**
     * The cleanup race. The old request's `finally` deleted by key, so it threw
     * away the entry belonging to a request started after the session change -
     * losing deduplication and, worse, the abort handle the next sign-out needs.
     */
    const first = deferred<string>();
    const second = deferred<string>();

    const stale = fetchOnce("k", () => first.promise);

    clearResourceCache();

    const fresh = vi.fn().mockReturnValue(second.promise);
    const current = fetchOnce("k", fresh);

    // The old request settles *after* the new one is registered.
    first.resolve("stale");
    await stale;

    // A third subscriber must still join the in-flight request rather than
    // starting a second one.
    const joined = fetchOnce("k", fresh);

    second.resolve("fresh");
    await Promise.all([current, joined]);

    expect(fresh).toHaveBeenCalledTimes(1);
    expect(readCache<string>("k")?.data).toBe("fresh");
  });

  it("aborts what is still cancellable when the session ends", async () => {
    let seen: AbortSignal | undefined;
    const gate = deferred<string>();

    const pending = fetchOnce("k", (signal) => {
      seen = signal;
      return gate.promise;
    });

    expect(seen?.aborted).toBe(false);

    clearResourceCache();
    expect(seen?.aborted).toBe(true);

    gate.resolve("late");
    await pending;
  });

  it("gives the shared request its own signal, not a subscriber's", async () => {
    // Two panels showing one list made a single request carrying only the first
    // panel's signal, so unmounting that panel aborted the request out from
    // under the second. The signal handed to the factory must be the cache's.
    const gate = deferred<string>();
    const subscriberController = new AbortController();
    let seen: AbortSignal | undefined;

    const pending = fetchOnce("k", (signal) => {
      seen = signal;
      return gate.promise;
    });

    subscriberController.abort();

    expect(seen).toBeDefined();
    expect(seen).not.toBe(subscriberController.signal);
    expect(seen?.aborted).toBe(false);

    gate.resolve("value");
    await pending;
  });
});
