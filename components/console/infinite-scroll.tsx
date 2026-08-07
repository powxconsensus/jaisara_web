"use client";

import { useEffect, useRef } from "react";

/**
 * Loads the next page when the end of the list comes into view.
 *
 * `rootMargin` fires it 300px early so the next rows are usually already there
 * by the time the reader reaches them — an infinite scroll that only starts
 * fetching once you hit the bottom still makes you wait, it just hides the
 * button that would have told you to.
 *
 * The manual button is not a fallback for show: keyboard users, anyone with
 * reduced motion preferences, and the case where the observer never fires
 * because the list is shorter than the viewport all need it.
 */
export function InfiniteScrollSentinel({
  hasMore,
  loading,
  onLoadMore,
  label = "rows",
}: {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  label?: string;
}) {
  const sentinel = useRef<HTMLDivElement>(null);

  // The observer reads the handler through a ref so that a parent re-render —
  // which produces a new `onLoadMore` identity every time — does not tear the
  // observer down and rebuild it. Synced in an effect, not during render:
  // a ref written while rendering is not guaranteed to survive a discarded
  // render attempt.
  const load = useRef(onLoadMore);
  useEffect(() => {
    load.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    const element = sentinel.current;
    if (!element || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) load.current();
      },
      { rootMargin: "300px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [hasMore]);

  if (!hasMore) {
    return (
      <p className="py-6 text-center font-mono text-[9px] tracking-[0.16em] text-muted">
        END OF {label.toUpperCase()}
      </p>
    );
  }

  return (
    <div ref={sentinel} className="py-6 text-center">
      {loading ? (
        <p
          aria-live="polite"
          className="font-mono text-[9px] tracking-[0.16em] text-muted"
        >
          LOADING MORE…
        </p>
      ) : (
        <button
          type="button"
          onClick={onLoadMore}
          className="cursor-pointer rounded-[10px] border border-hair px-4 py-2.5 font-mono text-[9px] tracking-[0.14em] text-muted transition hover:border-primary hover:text-fg"
        >
          LOAD MORE
        </button>
      )}
    </div>
  );
}
