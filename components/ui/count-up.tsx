"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts a figure up on mount with an ease-out curve. Renders the final value
 * immediately for SSR and under reduced motion, so the number is never wrong
 * or missing — only the animation is optional.
 */
export function CountUp({
  to,
  prefix = "",
  suffix = "",
  decimals = 0,
  durationMs = 1400,
  className,
}: {
  to: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  durationMs?: number;
  className?: string;
}) {
  const [value, setValue] = useState(to);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(to * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to, durationMs]);

  const formatted = decimals
    ? value.toFixed(decimals)
    : Math.round(value).toLocaleString("en-US");

  return (
    <span ref={ref} data-count className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
