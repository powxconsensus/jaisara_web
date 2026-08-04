"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RECEIPTS, RECEIPT_INTERVAL_MS } from "@/lib/data/receipts";
import { ReceiptCard } from "./receipt-card";
import { GroundPlane } from "./ground-plane";
import { Pager } from "./pager";
import {
  CUE,
  ECHO_INTENSITY,
  FALL_DURATION_MS,
  playFall,
  playImpact,
  playStamp,
  prefersReducedMotion,
} from "./receipt-motion";

/**
 * The hero receipt deck (handoff §2): a stack of paper receipts tilted in 3D,
 * auto-advancing through real cashback events every 5.6s.
 *
 * State is only `index` and `paused` — deliberately NO animation phase. See
 * receipt-motion.ts for why that matters.
 *
 * Ghost cards use 2D transforms and the deck does not set
 * `transform-style: preserve-3d`: with preserve-3d + translateZ the component
 * fails to rasterise in html-to-image / print / PDF pipelines and screenshots
 * come out blank. The 2D fallback is visually identical at these angles.
 */
export function ReceiptDeck() {
  const [index, setIndex] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const stampRef = useRef<HTMLDivElement>(null);
  const groundRef = useRef<HTMLDivElement>(null);
  // Hover pause is read inside a timer callback, so it lives in a ref rather
  // than state — no re-render needed, and no stale closure.
  const pausedRef = useRef(false);
  const cuesRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearCues = useCallback(() => {
    cuesRef.current.forEach(clearTimeout);
    cuesRef.current = [];
  }, []);

  /**
   * Advance the deck. `to` jumps directly to an index and bypasses the pause
   * guard, which is what the pager dots want.
   */
  const advance = useCallback(
    (to?: number) => {
      if (to === undefined && pausedRef.current) return;
      const card = cardRef.current;
      const step = () =>
        setIndex((current) => (to === undefined ? (current + 1) % RECEIPTS.length : to));

      if (!card || prefersReducedMotion()) {
        step();
        return;
      }

      clearCues();
      playFall(card);
      // Everything else hangs off the same timeline.
      cuesRef.current = [
        setTimeout(step, FALL_DURATION_MS * CUE.contentSwap),
        setTimeout(() => playImpact(groundRef.current), FALL_DURATION_MS * CUE.impact),
        setTimeout(() => playStamp(stampRef.current), FALL_DURATION_MS * CUE.stamp),
        setTimeout(
          () => playImpact(groundRef.current, ECHO_INTENSITY),
          FALL_DURATION_MS * CUE.echo,
        ),
      ];
    },
    [clearCues],
  );

  useEffect(() => {
    // A plain per-instance interval. Never coordinate through a global: a
    // remount races the unmount and leaves a stale id with no live timer,
    // freezing the rotation. A duplicate interval is harmless because
    // `advance` cancels in-flight animations first.
    const id = setInterval(() => advance(), RECEIPT_INTERVAL_MS);
    return () => {
      clearInterval(id);
      clearCues();
    };
  }, [advance, clearCues]);

  // Settle the deck on first paint, matching the prototype's opening beat.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const id = setTimeout(() => playImpact(groundRef.current), 900);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="flex justify-center pb-[26px] md:pb-[150px] md:pt-[92px] md:[perspective:1500px] md:[perspective-origin:62%_38%]">
      <div className="w-full motion-safe:md:[animation:jsFloat_9s_1.4s_ease-in-out_infinite] md:w-[min(438px,100%)]">
        <div
          onMouseEnter={() => {
            pausedRef.current = true;
          }}
          onMouseLeave={() => {
            pausedRef.current = false;
          }}
          className="group relative w-full transition-transform duration-700 ease-[cubic-bezier(.2,.8,.2,1)] md:[transform:rotateY(-14deg)_rotateX(6deg)_rotateZ(-2.8deg)] md:hover:[transform:rotateY(-7deg)_rotateX(3deg)_rotateZ(-1.2deg)_scale(1.025)]"
        >
          {/* Ghost cards behind the live one — 2D transforms only. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 hidden rounded-receipt border border-hair opacity-[.28] [transform:translate(30px,34px)_rotate(3.4deg)_scale(.9)] md:block"
            style={{ background: "color-mix(in oklab, var(--surface) 78%, var(--bg))" }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 hidden rounded-receipt border border-hair opacity-50 [transform:translate(15px,17px)_rotate(1.7deg)_scale(.95)] md:block"
            style={{ background: "color-mix(in oklab, var(--surface) 90%, var(--bg))" }}
          />

          <ReceiptCard receipt={RECEIPTS[index]} cardRef={cardRef} stampRef={stampRef} />

          <GroundPlane ref={groundRef} />
          <Pager count={RECEIPTS.length} activeIndex={index} onSelect={(i) => advance(i)} />
        </div>
      </div>
    </div>
  );
}
