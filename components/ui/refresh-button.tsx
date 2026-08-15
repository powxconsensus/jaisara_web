"use client";

import { useEffect, useState } from "react";

/**
 * "This is how old, and here is how to ask again."
 *
 * Screens are served from cache and refreshed behind the reader, which is what
 * stops a shimmer on every visit - but it means the figures on screen may have
 * been read a minute ago. That is fine for a claim status and not fine in
 * silence: somebody checking whether a payout landed needs to know they are
 * looking at a cached answer, and needs a way to force a fresh one without
 * reloading the page.
 *
 * `refreshing` is deliberately not `loading`. Pressing this keeps the current
 * rows on screen and reports itself in the button label, so a refresh never
 * collapses a working panel back into skeletons.
 *
 * ── Why one component for two surfaces ────────────────────────────────────
 *
 * The console types its captions at `--ct-label`, which is declared on
 * `.console-root` and so does not exist on member pages. Rather than keep two
 * near-identical buttons in sync, the size falls back: 9px inside the console,
 * 10px everywhere else, which is the size member eyebrows already use.
 */
export function RefreshButton({
  onRefresh,
  refreshing,
  fetchedAt,
}: {
  onRefresh: () => void;
  refreshing: boolean;
  fetchedAt: number | null;
}) {
  const [now, setNow] = useState(() => Date.now());

  // Ticks only while something is on screen to label, and only every 15s - this
  // is a caption, not a stopwatch.
  useEffect(() => {
    if (fetchedAt === null) return;
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, [fetchedAt]);

  const age = fetchedAt === null ? null : Math.max(0, Math.round((now - fetchedAt) / 1000));

  return (
    <div className="flex items-center gap-2">
      {age !== null && (
        <span className="font-mono text-[length:var(--ct-label,10px)] tracking-[0.14em] text-muted">
          {age < 60 ? `${age}S AGO` : `${Math.round(age / 60)}M AGO`}
        </span>
      )}
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        aria-label="Refresh"
        className="cursor-pointer rounded-[9px] border border-hair px-3 py-2 font-mono text-[length:var(--ct-label,10px)] uppercase tracking-[0.14em] text-primary transition hover:border-primary disabled:cursor-wait disabled:opacity-55"
      >
        {refreshing ? "REFRESHING…" : "REFRESH"}
      </button>
    </div>
  );
}
