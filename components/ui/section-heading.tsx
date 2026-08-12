import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Landing-page section heading: a small mono eyebrow above an uppercase title.
 *
 * Every h2 pairs the uppercase phrase with exactly one lowercase Instrument
 * Serif italic word - pass it via `<Accent>`.
 */
export function SectionHeading({
  index,
  eyebrow,
  children,
  className,
}: {
  /** Optional number for flows that genuinely need ordered steps. */
  index?: string;
  eyebrow: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
        {index ? `[ ${index} ] ` : ""}
        {eyebrow}
      </p>
      <h2 className="m-0 font-display text-[clamp(26px,4vw,52px)] font-black uppercase leading-[0.98] tracking-[-0.025em]">
        {children}
      </h2>
    </div>
  );
}

/** The single lowercase serif-italic word in a section heading. */
export function Accent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn("font-serif font-normal normal-case italic tracking-normal text-primary", className)}
    >
      {children}
    </span>
  );
}
