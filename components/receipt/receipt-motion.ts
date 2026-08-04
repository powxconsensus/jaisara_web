/**
 * Motion for the hero receipt deck (handoff §2).
 *
 * ARCHITECTURE — read before changing any of this.
 *
 * The resting state (`opacity:1; transform:none`) is the card's own *static*
 * style, and nothing here ever writes `opacity` or `transform` as a persistent
 * value. The whole cycle runs as a single `element.animate(..., {fill:'none'})`,
 * so the card returns to its static style the instant the animation ends or is
 * cancelled. An interrupted timer, a hot reload or a cancelled animation
 * therefore leaves the card *visible* rather than stranded mid-phase.
 *
 * Two earlier implementations stored a phase (out/mid/in) in state and painted
 * it imperatively. Both shipped a permanently invisible receipt whenever a
 * timer in the chain was interrupted — the architecture was the bug. Do not
 * reintroduce a phase machine.
 */

/** Full duration of one fall-and-rock cycle, ms. */
export const FALL_DURATION_MS = 1320;

/** Points on the timeline where other effects are scheduled, as 0–1 offsets. */
export const CUE = {
  /** Swap the card's content while it is off-screen. */
  contentSwap: 0.3,
  /** Card strikes the ground. */
  impact: 0.62,
  /** The stamp re-punches. */
  stamp: 0.68,
  /** Softer echo bounce. */
  echo: 0.78,
} as const;

/** Echo impact intensity relative to the first strike. */
export const ECHO_INTENSITY = 0.55;

/**
 * The card falls onto its bottom-left corner and rocks flat, as one continuous
 * motion. Pivots on `transform-origin: 8% 100%`.
 */
const FALL_KEYFRAMES: Keyframe[] = [
  { transform: "none", opacity: 1, offset: 0, easing: "cubic-bezier(.55,.06,.68,.19)" },
  { transform: "translateY(70px) rotateZ(-13deg) scale(.93)", opacity: 0, offset: 0.28 },
  {
    transform: "translateY(-150px) translateX(24px) rotateZ(11deg) scale(1.02)",
    opacity: 0,
    offset: 0.32,
    easing: "cubic-bezier(.5,0,.75,.2)",
  },
  {
    transform: "translateY(0) translateX(6px) rotateZ(7.5deg)",
    opacity: 1,
    offset: 0.62,
    easing: "cubic-bezier(.3,.7,.2,1)",
  },
  {
    transform: "translateY(0) rotateZ(-4.5deg)",
    offset: 0.77,
    easing: "cubic-bezier(.35,.6,.25,1)",
  },
  { transform: "translateY(0) rotateZ(1.6deg)", offset: 0.89, easing: "ease-out" },
  { transform: "none", opacity: 1, offset: 1 },
];

const STAMP_KEYFRAMES: Keyframe[] = [
  {
    transform: "rotate(-19deg) scale(1.85)",
    opacity: 0,
    offset: 0,
    easing: "cubic-bezier(.5,0,.7,.2)",
  },
  {
    transform: "rotate(-8deg) scale(.9)",
    opacity: 1,
    offset: 0.5,
    easing: "cubic-bezier(.3,.8,.3,1)",
  },
  { transform: "rotate(-8deg) scale(1.03)", offset: 0.74 },
  { transform: "rotate(-8deg) scale(1)", offset: 1 },
];

export function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/** Run the fall. Cancels anything in flight so a rapid re-trigger is safe. */
export function playFall(card: HTMLElement): Animation | null {
  if (!card.animate) return null;
  card.getAnimations?.().forEach((animation) => animation.cancel());
  return card.animate(FALL_KEYFRAMES, { duration: FALL_DURATION_MS, fill: "none" });
}

/**
 * Re-punch the stamp. Driven imperatively because a CSS `animation` with a
 * delay fires once on first paint and never again — that was a bug.
 */
export function playStamp(stamp: HTMLElement | null) {
  if (!stamp?.animate) return;
  stamp.animate(STAMP_KEYFRAMES, { duration: 640, fill: "none" });
}

/**
 * Ground reaction: flash the glow and rays, drive the shockwave rings outward
 * and puff the dust. Purely decorative; skipped under reduced motion.
 */
export function playImpact(ground: HTMLElement | null, intensity = 1) {
  if (!ground) return;

  ground.querySelectorAll<HTMLElement>("[data-ground-fx]").forEach((node) => {
    node.getAnimations?.().forEach((animation) => animation.cancel());
  });

  const flash = (selector: string, peak: number, base: number, duration: number) => {
    const element = ground.querySelector<HTMLElement>(selector);
    element?.animate([{ opacity: base + (peak - base) * intensity }, { opacity: base }], {
      duration,
      easing: "ease-out",
      fill: "none",
    });
  };

  flash("[data-ground-glow]", 1, 0.5, 950);
  flash("[data-ground-ray]", 0.82, 0.32, 1150);

  ground.querySelectorAll<HTMLElement>("[data-ground-ring]").forEach((ring, i) => {
    ring.animate(
      [
        { transform: "translate(-50%,-50%) scale(.38)", opacity: 0.92 * intensity },
        {
          transform: `translate(-50%,-50%) scale(${(1.5 + i * 0.55) * (0.7 + 0.3 * intensity)})`,
          opacity: 0,
        },
      ],
      { duration: 1200, delay: i * 120, easing: "cubic-bezier(.16,.9,.3,1)", fill: "none" },
    );
  });

  ground.querySelector<HTMLElement>("[data-ground-dust]")?.animate(
    [
      { transform: "translate(-50%,-50%) scale(.5)", opacity: 0.5 * intensity },
      { transform: "translate(-50%,-50%) scale(1.9)", opacity: 0 },
    ],
    { duration: 1400, easing: "ease-out", fill: "none" },
  );
}
