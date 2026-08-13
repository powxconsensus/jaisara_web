import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import { HOW_IT_WORKS, type HowStep, type HowStepIcon } from "@/lib/data/content";
import { Reveal } from "@/components/ui/reveal";
import {
  CardIcon,
  ReceiptIcon,
  ShareIcon,
  TagIcon,
  WalletIcon,
} from "@/components/ui/icons";

/**
 * The journey as one rail: a medallion per step, joined by a connector that
 * visibly runs in the direction of travel.
 *
 * ── Why the numbers went ──────────────────────────────────────────────────
 * There were numbered nodes sitting on the connector between each pair of
 * steps. They were redundant - the steps are already in order, left to right,
 * and each one already carries a title - and they said nothing about the one
 * thing a first-time visitor is trying to work out, which is that this is a
 * sequence that flows one way and ends with money. Motion says that; a "3"
 * does not. So the connector marches, and a highlight travels the length of
 * it every few seconds, emerging from behind one medallion and vanishing
 * behind the next.
 *
 * Both animations are `motion-safe:` only. Something that loops forever in the
 * corner of the eye is precisely what a reduced-motion preference is asking to
 * be spared, and with them off the rail is still a connector with the steps in
 * order on it - nothing is carried by the motion alone.
 *
 * ── Geometry ──────────────────────────────────────────────────────────────
 * The columns are equal fractions of the track, so for `n` steps the centre of
 * column `i` is at `(i + 0.5) / n`. That is where the connector starts and
 * ends. Everything is derived, so a sixth step needs no remeasuring - the one
 * thing to keep in step is `grid-cols-5`, which Tailwind cannot generate from
 * a runtime length.
 *
 * Paint order is load-bearing: the rail is rendered *before* the `<ol>`, and
 * the medallions are opaque, so the connector appears to stop at each one and
 * the travelling pulse ducks behind them.
 */

const ICONS: Record<HowStepIcon, ComponentType<SVGProps<SVGSVGElement> & { size?: number }>> = {
  tag: TagIcon,
  card: CardIcon,
  receipt: ReceiptIcon,
  wallet: WalletIcon,
  share: ShareIcon,
};

/** Medallion centre, as a percentage of the track. */
const centre = (index: number, total: number) => ((index + 0.5) / total) * 100;

const DASH = "color-mix(in oklab, var(--primary) 34%, transparent)";
/** Must match the `jsRailFlow` / `jsRailFlowY` keyframe distance, or it jumps. */
const DASH_PERIOD = "16px";

/**
 * The icon disc. Its background is opaque - that is what makes the connector
 * behind it appear to stop at the medallion rather than run under it, and what
 * lets the travelling pulse duck out of sight.
 */
function Medallion({ step, size }: { step: HowStep; size: "sm" | "lg" }) {
  const Glyph = ICONS[step.icon];
  const tint = step.club ? "var(--club)" : "var(--primary)";

  return (
    <span className="relative grid place-items-center">
      {/* A soft pool of the step's own colour, so the disc sits in light
          instead of being pasted onto the background. */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute rounded-full blur-[14px] ${
          size === "lg" ? "size-[62px] opacity-45" : "size-11 opacity-35"
        }`}
        style={{ background: tint }}
      />
      <span
        className={`relative grid place-items-center rounded-full border ${
          step.club ? "text-club" : "text-primary"
        } ${size === "lg" ? "size-[54px]" : "size-11"}`}
        style={{
          borderColor: `color-mix(in oklab, ${tint} 42%, transparent)`,
          background: `color-mix(in oklab, var(--bg) 88%, ${tint})`,
          boxShadow: `inset 0 1px 0 color-mix(in oklab, ${tint} 22%, transparent)`,
        }}
      >
        <Glyph size={size === "lg" ? 23 : 19} />
      </span>
    </span>
  );
}

export function HowItWorks() {
  const steps = HOW_IT_WORKS;

  return (
    <Reveal className="mx-auto max-w-[var(--maxw)] px-[var(--pad)] pb-[var(--secpb)] pt-[var(--secpt)]">
      <div className="mb-9 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div>
          <p className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
            How it works
          </p>
          <h2 className="font-display text-[clamp(22px,2.6vw,31px)] font-black tracking-[-0.02em]">
            Simple steps. <span className="text-primary">Real cashback.</span>
          </h2>
        </div>

        <Link
          href="/deals"
          className="border-b border-primary pb-[3px] font-mono text-[11px] uppercase tracking-[0.15em] text-fg transition hover:text-primary"
        >
          Start with a deal ↗
        </Link>
      </div>

      {/* ---- Desktop rail ------------------------------------------------ */}
      <div className="relative hidden md:block">
        <div
          aria-hidden="true"
          className="absolute top-[27px] h-px"
          style={{
            left: `${centre(0, steps.length)}%`,
            right: `${centre(0, steps.length)}%`,
          }}
        >
          <div
            className="absolute inset-0 motion-safe:[animation:jsRailFlow_.9s_linear_infinite]"
            style={{
              backgroundImage: `repeating-linear-gradient(90deg, ${DASH} 0 7px, transparent 7px ${DASH_PERIOD})`,
              backgroundSize: `${DASH_PERIOD} 100%`,
            }}
          />
          <div
            className="absolute -top-px h-[3px] w-[88px] -translate-x-1/2 rounded-full opacity-0 blur-[0.5px] motion-safe:[animation:jsRailPulse_3.6s_ease-in-out_infinite]"
            style={{ background: "linear-gradient(90deg, transparent, var(--primary), transparent)" }}
          />
        </div>

        <ol className="grid grid-cols-5 gap-x-3">
          {steps.map((step) => (
            <li
              key={step.title}
              className="group flex flex-col items-center px-1 text-center"
            >
              <span className="mb-4 transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)] group-hover:-translate-y-1">
                <Medallion step={step} size="lg" />
              </span>
              <h3 className="mb-1.5 font-display text-[15.5px] font-bold tracking-[-0.015em]">
                {step.title}
              </h3>
              <p className="m-0 max-w-[26ch] text-[12.5px] leading-[1.6] text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>

      {/* ---- Phone rail ---------------------------------------------------
          The same journey turned on its side: the connector becomes a spine
          down the left, flowing downward, and each step is a row against it.
          Five columns at this width would either scroll sideways or squeeze
          the copy to nothing. The `01…05` prefixes stay here - they sit in the
          headings rather than on the rail, and a vertical list reads as
          unordered without them. */}
      <ol className="relative md:hidden">
        <div aria-hidden="true" className="absolute bottom-9 left-[21px] top-9 w-px">
          <div
            className="absolute inset-0 motion-safe:[animation:jsRailFlowY_.9s_linear_infinite]"
            style={{
              backgroundImage: `repeating-linear-gradient(180deg, ${DASH} 0 7px, transparent 7px ${DASH_PERIOD})`,
              backgroundSize: `100% ${DASH_PERIOD}`,
            }}
          />
          <div
            className="absolute -left-px h-[88px] w-[3px] -translate-y-1/2 rounded-full opacity-0 motion-safe:[animation:jsRailPulseY_3.6s_ease-in-out_infinite]"
            style={{ background: "linear-gradient(180deg, transparent, var(--primary), transparent)" }}
          />
        </div>

        {steps.map((step, i) => (
          <li key={step.title} className="relative grid grid-cols-[44px_1fr] gap-x-4 pb-6 last:pb-0">
            <Medallion step={step} size="sm" />
            <div className="pt-1">
              <h3 className="mb-1 font-display text-[15px] font-bold tracking-[-0.015em]">
                <span className="mr-2 font-mono text-[10.5px] font-normal text-muted">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {step.title}
              </h3>
              <p className="m-0 text-[12.8px] leading-[1.6] text-muted">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </Reveal>
  );
}
