"use client";

import { useEffect, useState } from "react";

/**
 * The activity band under the hero. It rotates through the latest verified
 * rewards, even when the newest one is not from today.
 *
 * The marquee pauses on hover and on focus-within, and stops entirely under
 * reduced motion (handoff §4.1). The track is duplicated so translating it
 * -50% loops seamlessly; the copy is hidden from assistive tech.
 */
export function LiveMarquee({ lines }: { lines?: string[] }) {
  const feed = lines ?? [];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setIndex((i) => i + 1), 3200);
    return () => clearInterval(id);
  }, []);

  const line = feed.length > 0 ? feed[index % feed.length] : null;

  return (
    /* The top margin sets where the ground's horizon lands: the ticker pins to
       the base of the hero, so every pixel here pushes the floor further down
       the plane and the receipt's impact further away. */
    <div className="mt-[clamp(18px,2.4vw,32px)] flex flex-wrap items-center border-t border-hair leading-[normal]">
      <div className="flex flex-none items-center gap-[11px] border-hair py-4 pr-[26px] md:border-r">
        <span className={`size-1.5 rounded-[2px] ${feed.length > 0 ? "bg-success" : "bg-muted"}`} />
        <span className="font-mono text-[9.5px] tracking-[0.2em] text-muted">
          {feed.length > 0 ? "LATEST" : "ACTIVITY"}
        </span>
        {line && (
          <span
            key={line}
            aria-live="polite"
            className="max-w-[min(56vw,480px)] truncate font-mono text-[11px] tracking-[0.04em] [animation:jsFeedIn_.5s_both]"
          >
            {line}
          </span>
        )}
      </div>

      <div className="min-w-[200px] flex-1 py-4 pl-[22px] font-mono text-[10px] tracking-[0.1em] text-muted">
        {feed.length > 0 ? "LATEST VERIFIED REWARDS" : null}
      </div>
    </div>
  );
}
