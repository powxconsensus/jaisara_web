"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Reveals its children as they scroll into view, with a stagger step of .09s.
 *
 * Anything already in view on load is revealed immediately, so a deep-linked
 * section is never left faded (handoff §6). Skipped entirely under reduced
 * motion, and content is always rendered — only the animation is conditional.
 */
export function Reveal({
  children,
  step = 0,
  className,
  id,
}: {
  children: ReactNode;
  /** Stagger index; each step delays the reveal by 90ms. */
  step?: number;
  className?: string;
  id?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Reduced motion needs no work here: the hidden state is applied through
    // `motion-safe:`, so it simply never engages.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          setRevealed(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.05, rootMargin: "0px 0px -6% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      id={id}
      className={cn(!revealed && "motion-safe:opacity-0", className)}
      style={
        revealed
          ? { animation: `jsReveal .8s cubic-bezier(.2,.8,.2,1) ${step * 0.09}s both` }
          : undefined
      }
    >
      {children}
    </div>
  );
}
