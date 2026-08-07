"use client";

import { useEffect, useState } from "react";
import { LIVE_FEED } from "@/lib/data/content";
import { topFirmsByCashback } from "@/lib/data/firms";

const TICKER_FIRMS = topFirmsByCashback(10);

/**
 * The LIVE band under the hero: a rotating event ticker beside a scrolling
 * rate marquee.
 *
 * The marquee pauses on hover and on focus-within, and stops entirely under
 * reduced motion (handoff §4.1). The track is duplicated so translating it
 * -50% loops seamlessly; the copy is hidden from assistive tech.
 */
export function LiveMarquee({ lines }: { lines?: string[] }) {
  // Real cashback when there is any, the designed copy while the platform is
  // new — an empty ticker under the hero reads as broken, not as honest.
  const feed = lines && lines.length > 0 ? lines : LIVE_FEED;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setIndex((i) => i + 1), 3200);
    return () => clearInterval(id);
  }, []);

  const line = feed[index % feed.length];

  return (
    /* The top margin sets where the ground's horizon lands: the ticker pins to
       the base of the hero, so every pixel here pushes the floor further down
       the plane and the receipt's impact further away. */
    <div className="mt-[clamp(22px,3vw,38px)] flex flex-wrap items-center border-t border-hair leading-[normal]">
      <div className="flex flex-none items-center gap-[11px] border-hair py-4 pr-[26px] md:border-r">
        <span className="size-1.5 rounded-[2px] bg-success" />
        <span className="font-mono text-[9.5px] tracking-[0.2em] text-muted">LIVE</span>
        <span
          key={line}
          aria-live="polite"
          className="max-w-[min(56vw,480px)] truncate font-mono text-[11px] tracking-[0.04em] [animation:jsFeedIn_.5s_both]"
        >
          {line}
        </span>
      </div>

      <div
        className="group min-w-[200px] flex-1 overflow-hidden py-4"
        style={{
          maskImage: "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
          WebkitMaskImage: "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
        }}
      >
        <div className="flex w-max motion-safe:[animation:jsMarquee_36s_linear_infinite] group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]">
          {[false, true].map((isClone) => (
            <div
              key={String(isClone)}
              aria-hidden={isClone || undefined}
              className="flex items-center gap-11 pl-[22px] pr-11"
            >
              {TICKER_FIRMS.map((firm) => (
                <span key={firm.slug} className="flex flex-none items-center gap-[11px]">
                  <span className="whitespace-nowrap font-mono text-[11.5px] uppercase tracking-[0.1em] text-muted">
                    {firm.name}
                  </span>
                  <span className="font-mono text-[11.5px] tabular-nums text-primary">
                    {firm.cashback}%
                  </span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
