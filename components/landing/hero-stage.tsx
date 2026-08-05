"use client";

import type { MouseEvent, ReactNode } from "react";

/**
 * The hero's stage: the section itself, plus the pointer spotlight.
 *
 * `--mx` / `--my` are written straight onto the element rather than held in
 * state — a hero that re-rendered on every mouse move would drop frames on the
 * two canvases behind it. The atmosphere layer reads them.
 *
 * `min-height` only bites on desktop (the token is `auto` below 1180px), and
 * the 102px minimum padding is load-bearing: the sticky nav ends at y=72 and
 * the eyebrow clips underneath it with anything less.
 */
export function HeroStage({ children }: { children: ReactNode }) {
  const trackPointer = (event: MouseEvent<HTMLElement>) => {
    const el = event.currentTarget;
    const bounds = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${event.clientX - bounds.left}px`);
    el.style.setProperty("--my", `${event.clientY - bounds.top}px`);
  };

  return (
    <section
      onMouseMove={trackPointer}
      className="relative -mt-[var(--nav-h)] flex min-h-[var(--herominh)] flex-col overflow-x-clip px-[var(--pad)] pt-[clamp(102px,11vh,132px)]"
    >
      {children}
    </section>
  );
}
