import Link from "next/link";
import { HOW_IT_WORKS } from "@/lib/data/content";
import { Reveal } from "@/components/ui/reveal";

/**
 * Five numbered steps plus a closing card, laid out as
 * cells sharing hairline gaps. On phones each step collapses to a two-column
 * grid with the number beside the title.
 */
export function HowItWorks() {
  return (
    <Reveal className="mx-auto max-w-[var(--maxw)] px-[var(--pad)] pb-[var(--secpb)] pt-[var(--secpt)]">
      <p className="mb-7 font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
        How it works
      </p>

      <div className="grid gap-px overflow-hidden rounded-card border border-hair bg-hair md:grid-cols-2 lg:grid-cols-3">
        {HOW_IT_WORKS.map((step, i) => (
          <div
            key={step.title}
            className="grid grid-cols-[20px_1fr] content-start gap-x-3 bg-bg px-4 pb-4 pt-3.5 md:grid-cols-1 md:px-[22px] md:pb-[26px] md:pt-[22px] lg:px-[26px] lg:pb-8 lg:pt-7"
          >
            <div
              className={`row-span-2 pt-0.5 font-mono text-[10.5px] md:row-span-1 md:mb-4 md:pt-0 ${
                step.club ? "text-club" : "text-muted"
              }`}
            >
              {String(i + 1).padStart(2, "0")}
            </div>
            <h3 className="mb-1 font-display text-[15px] font-bold tracking-[-0.015em] md:mb-2 md:text-[17px]">
              {step.title}
            </h3>
            <p className="m-0 text-[12.8px] leading-[1.65] text-muted md:text-[13.5px]">
              {step.body}
            </p>
          </div>
        ))}

        {/* Closing card, tinted toward the accent. */}
        <div
          className="flex flex-col justify-center gap-3.5 px-4 py-4 md:px-[22px] md:py-[22px] lg:px-[26px] lg:py-7"
          style={{ background: "color-mix(in oklab, var(--surface) 90%, var(--primary))" }}
        >
          <p className="text-sm leading-[1.6] text-muted">
            Average trader keeps <span className="font-mono text-fg">$21</span> back per challenge.
          </p>
          <Link
            href="/deals"
            className="self-start border-b border-primary pb-[3px] font-mono text-[11px] uppercase tracking-[0.15em] text-fg"
          >
            Start with a deal
          </Link>
        </div>
      </div>
    </Reveal>
  );
}
