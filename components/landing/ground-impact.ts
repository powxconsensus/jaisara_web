/**
 * What a landing does to the ledger floor (handoff, Hero spec).
 *
 * The rule that shaped all of this: **seams read bright, not dark.** A black
 * trench on a near-black floor is invisible — a crack has to be a glowing seam
 * with the darkness *around* it. And it must stay restrained: if it reads as an
 * explosion it is wrong.
 *
 * Every animation runs with `fill:'none'`, so each element returns to its own
 * static style the instant it ends or is cancelled. Nothing here writes a
 * persistent `opacity` or `transform`.
 */

import type { ImpactEvent } from "./impact-context";

/** Marks the elements this module drives, so it can find and cancel them. */
export const FX = {
  glow: "glow",
  core: "core",
  ray: "ray",
  crack: "crack",
  crackHot: "crack-hot",
  chip: "chip",
  ring: "ring",
  dust: "dust",
} as const;

/** Resting opacities — these live in the markup and are restored by fill:'none'. */
export const REST = { glow: 0.42, ray: 0.1, core: 0 } as const;

const ALL_FX = Object.values(FX)
  .map((name) => `[data-fx="${name}"]`)
  .join(",");

export function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

function query(root: HTMLElement, name: string): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(`[data-fx="${name}"]`)];
}

/**
 * Break the ledger. Called **once** per landing — see `ImpactEvent`.
 *
 * `hot` is the claim's status: a paid claim lands at full intensity, a pending
 * one at 0.66× across the board, so the two states feel different without
 * needing a second animation.
 */
export function playImpact(root: HTMLElement, { hot }: ImpactEvent) {
  if (prefersReducedMotion() || !root.animate) return;

  // A re-trigger must not stack; cancel first so every element is back at its
  // static style before the new fracture starts.
  for (const node of root.querySelectorAll<HTMLElement>(ALL_FX)) {
    node.getAnimations?.().forEach((animation) => animation.cancel());
  }

  const heat = hot ? 1 : 0.66;

  const flash = (name: string, peak: number, base: number, ms: number, easing = "ease-out") => {
    for (const el of query(root, name)) {
      el.animate([{ opacity: base + (peak - base) * heat }, { opacity: base }], {
        duration: ms,
        easing,
        fill: "none",
      });
    }
  };

  flash(FX.glow, hot ? 0.58 : 0.48, REST.glow, 1150);
  flash(FX.ray, hot ? 0.17 : 0.12, REST.ray, 1250);
  flash(FX.core, hot ? 0.24 : 0.12, REST.core, 560, "cubic-bezier(.1,.6,.2,1)");

  query(root, FX.ring).forEach((ring, i) => {
    ring.animate(
      [
        { transform: "translate(-50%,-50%) scale(.42)", opacity: (i ? 0.11 : 0.22) * heat },
        { transform: `translate(-50%,-50%) scale(${1.35 + i * 0.52})`, opacity: 0 },
      ],
      { duration: 1450 + i * 190, delay: i * 150, easing: "cubic-bezier(.08,.86,.24,1)", fill: "none" },
    );
  });

  for (const dust of query(root, FX.dust)) {
    dust.animate(
      [
        { transform: "translate(-50%,-50%) scale(.4)", opacity: 0.34 * heat },
        { transform: "translate(-50%,-50%) scale(2.2)", opacity: 0 },
      ],
      { duration: 2100, easing: "cubic-bezier(.1,.7,.3,1)", fill: "none" },
    );
  }

  // The fracture front races out in ~180ms, flashes at the tip, then cools to
  // a glowing scar over the rest of the second.
  query(root, FX.crack).forEach((crack, i) => {
    const rotate = `rotate(${crack.dataset.angle ?? 0}deg) `;
    const delay = i * 9 + (i % 3) * 6;
    crack.animate(
      [
        { transform: `${rotate}scaleX(.02)`, opacity: 0, offset: 0, easing: "cubic-bezier(0,.9,.16,1)" },
        { transform: `${rotate}scaleX(1)`, opacity: hot ? 0.4 : 0.28, offset: 0.14, easing: "linear" },
        { transform: `${rotate}scaleX(1)`, opacity: 0.2 * heat, offset: 0.38, easing: "cubic-bezier(.4,0,.7,.5)" },
        { transform: `${rotate}scaleX(1)`, opacity: 0, offset: 1 },
      ],
      { duration: 1300, delay, fill: "none" },
    );

    const hotCore = crack.querySelector<HTMLElement>(`[data-fx="${FX.crackHot}"]`);
    hotCore?.animate(
      [
        { opacity: 0, offset: 0 },
        { opacity: hot ? 0.5 : 0.32, offset: 0.1, easing: "cubic-bezier(.3,0,.6,.4)" },
        { opacity: 0.1, offset: 0.32, easing: "ease-out" },
        { opacity: 0, offset: 1 },
      ],
      { duration: 900, delay, fill: "none" },
    );
  });

  // Debris arcs out, lifts off the plane on translateZ, and settles.
  query(root, FX.chip).forEach((chip, i) => {
    const radians = ((Number(chip.dataset.angle) || 0) * Math.PI) / 180;
    const distance = Number(chip.dataset.distance) || 60;
    const x = Math.cos(radians) * distance;
    const y = Math.sin(radians) * distance;
    const spin = 180 + i * 47;
    const at = (k: number) => `translate(${(x * k).toFixed(1)}px,${(y * k).toFixed(1)}px)`;

    chip.animate(
      [
        { transform: "translate(0px,0px) translateZ(0px) rotate(0deg) scale(.6)", opacity: 0, offset: 0, easing: "cubic-bezier(.05,.8,.3,1)" },
        { transform: `${at(0.34)} translateZ(22px) rotate(${(spin * 0.35).toFixed(0)}deg) scale(1)`, opacity: 0.34 * heat, offset: 0.26, easing: "cubic-bezier(.4,0,.75,.6)" },
        { transform: `${at(1)} translateZ(0px) rotate(${(spin * 0.88).toFixed(0)}deg) scale(.88)`, opacity: 0.16 * heat, offset: 0.68, easing: "ease-out" },
        { transform: `${at(1.07)} translateZ(0px) rotate(${spin}deg) scale(.82)`, opacity: 0, offset: 1 },
      ],
      { duration: 1250, delay: 30 + i * 26, fill: "none" },
    );
  });
}
