"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Tracks a CSS media query. Returns `false` during SSR and hydration, then the
 * real value - read through `useSyncExternalStore` so there is no state-in-
 * effect and no hydration mismatch.
 *
 * Use only where the two layouts differ structurally (e.g. the estimator's
 * wizard). Prefer plain CSS breakpoints everywhere else.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
