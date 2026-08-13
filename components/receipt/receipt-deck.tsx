"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RECEIPT_INTERVAL_MS, SAMPLE_RECEIPTS, type Receipt } from "@/lib/data/receipts";
import { useImpact, type ImpactEvent } from "@/components/landing/impact-context";
import { ReceiptCard } from "./receipt-card";
import {
  CUE,
  FALL_DURATION_MS,
  playFall,
  playStamp,
  prefersReducedMotion,
} from "./receipt-motion";

/**
 * The hero receipt (handoff §2): a single sheet of paper, auto-advancing
 * through real cashback events every 5.6s.
 *
 * **There is no deck of stacked sheets behind it.** Two offset "ghost" sheets
 * used to sit behind the card to suggest a pile; the moment the card animated
 * away they read as an empty container floating in the hero. Do not bring them
 * back.
 *
 * There is no pager either: this is a live feed of recent approved claims, and
 * dots would frame it as a fixed slideshow. Rotation pauses on hover and on
 * focus-within so it can still be read.
 *
 * State is only `index` and a pause flag - deliberately NO animation phase. See
 * receipt-motion.ts for why that matters. (`sample` is fixed once on mount
 * alongside the deck and never changes, so it is not a phase.)
 *
 * With an empty feed it rotates through `SAMPLE_RECEIPTS` instead, labelled as
 * examples on the card itself. There is deliberately no separate empty-state
 * branch: one render path means the fall, the ground strike and the stamp are
 * the same code whether the figures are live or illustrative.
 */
export function ReceiptDeck({ receipts }: { receipts?: Receipt[] }) {
  // Captured once: the feed is server-rendered and fixed for the life of this
  // component, and a `deck` whose identity changed would land in the timer and
  // animation dependencies below - restarting rotation mid-cycle is exactly
  // the class of bug this component's architecture exists to prevent.
  //
  // With no live feed the deck falls back to worked examples rather than to an
  // empty container or a card with every figure blanked out. `sample` is fixed
  // at the same moment as the deck, so a card can never be labelled as an
  // example while showing somebody's real cashback, or the reverse.
  const [{ deck, sample }] = useState<{ deck: Receipt[]; sample: boolean }>(() =>
    receipts && receipts.length > 0
      ? { deck: receipts, sample: false }
      : { deck: SAMPLE_RECEIPTS, sample: true },
  );
  const [index, setIndex] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const stampRef = useRef<HTMLDivElement>(null);
  // The index is mirrored in a ref so `advance` never depends on it. If it
  // did, the swap it schedules would change `advance`'s identity mid-fall,
  // re-run the interval effect, and its cleanup would clear the cues for the
  // impact, stamp and echo that had not fired yet - the card would land on a
  // ledger that never fractured.
  const indexRef = useRef(0);
  // Hover/focus pause is read inside a timer callback, so it lives in a ref
  // rather than state - no re-render, and no stale closure.
  const pausedRef = useRef(false);
  const cuesRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const impact = useImpact();

  // Hand the ground the card, so it can measure where the strike falls.
  useEffect(() => {
    if (!impact) return;
    impact.setTarget(cardRef.current);
    return () => impact.setTarget(null);
  }, [impact]);

  const clearCues = useCallback(() => {
    cuesRef.current.forEach(clearTimeout);
    cuesRef.current = [];
  }, []);

  /** Tell the ground the card has touched down, and what kind of touch it was. */
  const strike = useCallback((event: ImpactEvent) => impact?.emit(event), [impact]);

  const advance = useCallback(() => {
    if (pausedRef.current) return;
    const card = cardRef.current;
    const next = (indexRef.current + 1) % deck.length;
    const step = () => {
      indexRef.current = next;
      setIndex(next);
    };

    if (!card || prefersReducedMotion()) {
      step();
      return;
    }

    // The sheet on screen at the moment of impact is the *next* one, so the
    // fracture reads its intensity from that claim: paid lands harder.
    const hot = deck[next].status === "paid";

    clearCues();
    playFall(card);
    // Everything else hangs off the same timeline. The sheet rocks after it
    // lands, but the ledger breaks exactly once - see ImpactEvent.
    cuesRef.current = [
      setTimeout(step, FALL_DURATION_MS * CUE.contentSwap),
      setTimeout(() => strike({ hot }), FALL_DURATION_MS * CUE.impact),
      setTimeout(() => playStamp(stampRef.current), FALL_DURATION_MS * CUE.stamp),
    ];
  }, [clearCues, strike, deck]);

  useEffect(() => {
    // A plain per-instance interval, mounted once. Never coordinate through a
    // global: a remount races the unmount and leaves a stale id with no live
    // timer, freezing the rotation. A duplicate interval is harmless because
    // `advance` cancels in-flight animations first.
    const id = setInterval(advance, RECEIPT_INTERVAL_MS);
    return () => {
      clearInterval(id);
      clearCues();
    };
  }, [advance, clearCues]);

  // Settle the first sheet onto the ground, so the hero opens with a landing.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const id = setTimeout(() => strike({ hot: deck[0].status === "paid" }), 900);
    return () => clearTimeout(id);
  }, [strike, deck]);

  // No `aria-label` describing this as an example. A screen reader should get
  // exactly what the card says, and the card no longer badges itself - the
  // honesty is in the content (no member, no timestamp, no reference), not in
  // a caption only one audience hears.
  return (
    <div className="flex justify-center pb-[var(--rcpt-mb)] pt-[var(--rcpt-top)] [perspective-origin:62%_38%] [perspective:var(--rcpt-persp)]">
      <div className="w-[var(--rcpt-w)] motion-safe:[animation:var(--rcpt-float)]">
        <div
          onMouseEnter={() => {
            pausedRef.current = true;
          }}
          onMouseLeave={() => {
            pausedRef.current = false;
          }}
          onFocusCapture={() => {
            pausedRef.current = true;
          }}
          onBlurCapture={() => {
            pausedRef.current = false;
          }}
          className="relative w-full transition-transform duration-700 ease-[cubic-bezier(.2,.8,.2,1)] [transform:var(--rcpt-tf)] hover:[transform:var(--rcpt-tfh)]"
        >
          {/* Halo: the sheet catches light before it reaches the floor. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-[-12%] inset-y-[-16%] rounded-full opacity-[0.55] blur-[48px]"
            style={{
              background:
                "radial-gradient(closest-side, color-mix(in oklab, var(--primary) 30%, transparent), transparent 76%)",
            }}
          />

          <ReceiptCard
            receipt={deck[index % deck.length]}
            cardRef={cardRef}
            stampRef={stampRef}
            sample={sample}
          />
        </div>
      </div>
    </div>
  );
}
