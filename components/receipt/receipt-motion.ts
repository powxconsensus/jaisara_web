/**
 * Motion for the hero receipt (handoff §2).
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
export const FALL_DURATION_MS = 1150;

/** Points on the timeline where other effects are scheduled, as 0–1 offsets. */
export const CUE = {
  /** Swap the card's content while it is off-screen. */
  contentSwap: 0.23,
  /** Card strikes the ground and the ledger fractures. */
  impact: 0.56,
  /** The stamp re-punches. */
  stamp: 0.62,
} as const;

/**
 * The card sinks out of frame, drops back in from above and rocks flat, as one
 * continuous motion. Pivots on `transform-origin: 8% 100%` — it lands on its
 * bottom-left corner, which is the edge the fracture below answers.
 */
const FALL_KEYFRAMES: Keyframe[] = [
  { transform: "none", opacity: 1, offset: 0, easing: "cubic-bezier(.4,0,.85,.4)" },
  { transform: "translateY(26px) scale(.98)", opacity: 0, offset: 0.2 },
  {
    transform: "translateY(-118px) rotateZ(4.5deg)",
    opacity: 0,
    offset: 0.26,
    easing: "cubic-bezier(.6,0,.9,.3)",
  },
  {
    transform: "translateY(-74px) rotateZ(3.8deg)",
    opacity: 1,
    offset: 0.38,
    easing: "cubic-bezier(.7,0,.95,.35)",
  },
  {
    transform: "translateY(0) rotateZ(2.6deg)",
    offset: 0.56,
    easing: "cubic-bezier(.2,.85,.3,1)",
  },
  {
    transform: "translateY(0) rotateZ(-1.2deg)",
    offset: 0.72,
    easing: "cubic-bezier(.3,.8,.3,1)",
  },
  { transform: "translateY(0) rotateZ(.4deg)", offset: 0.87, easing: "ease-out" },
  { transform: "none", opacity: 1, offset: 1 },
];

const STAMP_KEYFRAMES: Keyframe[] = [
  {
    transform: "rotate(-17deg) scale(1.6)",
    opacity: 0,
    offset: 0,
    easing: "cubic-bezier(.5,0,.7,.2)",
  },
  {
    transform: "rotate(-8deg) scale(.94)",
    opacity: 1,
    offset: 0.5,
    easing: "cubic-bezier(.3,.8,.3,1)",
  },
  { transform: "rotate(-8deg) scale(1.02)", offset: 0.76 },
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
  stamp.animate(STAMP_KEYFRAMES, { duration: 680, fill: "none" });
}
