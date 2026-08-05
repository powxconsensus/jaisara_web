"use client";

import { useCallback, useEffect, useRef } from "react";
import { FloorFlow } from "./floor-flow";
import { ImpactField } from "./impact-field";
import { playImpact } from "./ground-impact";
import { useImpact } from "./impact-context";

/**
 * The ledger floor (handoff, Hero spec).
 *
 * The ground is the ledger every transaction is written on: it runs from a
 * distant horizon — the market — toward the viewer, the trader. The receipt is
 * a physical object that lands on it, and where it lands the ledger fractures
 * and light escapes.
 *
 * The plane carries **vertical lanes only**. Cross-hatching read as graph paper
 * and fought the depth; lanes converging on the horizon are what sells it, and
 * the moving rungs in the canvas above supply the other axis.
 *
 * Everything here is decorative and skipped under reduced motion.
 */

/** Where the strike sits relative to the card, and how wide the field is. */
const CONTACT_OFFSET_PX = 26;
const FIELD_RATIO = 1.62;
const FIELD_MIN = 300;
const FIELD_MAX = 880;
/** Layout settles in stages — fonts, images, the reveal animations. */
const SYNC_DELAYS_MS = [80, 520, 1400];

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const LANE_MASK =
  "radial-gradient(74% 96% at 50% 0%, #000 0, #000 44%, rgba(0,0,0,.68) 68%, rgba(0,0,0,.16) 86%, transparent 100%)";

export function HeroGround() {
  const impact = useImpact();
  const rootRef = useRef<HTMLDivElement>(null);

  /**
   * Point the impact field at wherever the card actually is. Read live rather
   * than hardcoded so the fracture follows the receipt across breakpoints —
   * and so it is obviously not a canned position.
   */
  const sync = useCallback(() => {
    const root = rootRef.current;
    const rect = impact?.measureTarget();
    if (!root || !rect) return;

    const ground = root.getBoundingClientRect();
    if (!ground.width || !ground.height || !rect.width) return;

    const x = ((rect.left + rect.width / 2 - ground.left) / ground.width) * 100;
    const y = ((rect.bottom + CONTACT_OFFSET_PX - ground.top) / ground.height) * 100;

    root.style.setProperty("--impx", `${clamp(x, 6, 94).toFixed(2)}%`);
    root.style.setProperty("--impy", `${clamp(y, 16, 74).toFixed(2)}%`);
    root.style.setProperty(
      "--impw",
      `${Math.round(clamp(rect.width * FIELD_RATIO, FIELD_MIN, FIELD_MAX))}px`,
    );
  }, [impact]);

  useEffect(() => {
    const timers = SYNC_DELAYS_MS.map((ms) => setTimeout(sync, ms));
    window.addEventListener("resize", sync);
    sync();
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("resize", sync);
    };
  }, [sync]);

  useEffect(() => {
    if (!impact) return;
    return impact.subscribe((event) => {
      const root = rootRef.current;
      if (!root) return;
      sync();
      playImpact(root, event);
    });
  }, [impact, sync]);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[var(--groundh)] overflow-hidden [perspective-origin:50%_0%] [perspective:var(--groundpersp)]"
    >
      {/* The plane, laid flat and running away to the horizon. */}
      <div
        className="absolute inset-x-[-60%] top-0 h-[var(--groundplane)] origin-top [transform:rotateX(var(--groundrot))]"
        style={{
          backgroundImage:
            "linear-gradient(to right, color-mix(in oklab, var(--primary) 38%, transparent) 1px, transparent 1px)",
          backgroundSize: "var(--groundgrid) var(--groundgrid)",
          backgroundPosition: "50% 0",
          maskImage: LANE_MASK,
          WebkitMaskImage: LANE_MASK,
        }}
      />

      <FloorFlow />

      {/* Light gathering at the far edge, and the horizon line itself. */}
      <div
        className="absolute inset-x-0 top-0 h-16"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--primary) 13%, transparent), transparent 82%)",
          maskImage: "linear-gradient(90deg, transparent, #000 18%, #000 82%, transparent)",
          WebkitMaskImage: "linear-gradient(90deg, transparent, #000 18%, #000 82%, transparent)",
        }}
      />
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, color-mix(in oklab, var(--primary) 46%, transparent) 14%, color-mix(in oklab, var(--primary) 88%, transparent) 50%, color-mix(in oklab, var(--primary) 46%, transparent) 86%, transparent)",
        }}
      />

      <ImpactField />
    </div>
  );
}
