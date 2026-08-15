"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

/**
 * A firm's logo, or its monogram when there isn't one.
 *
 * One component for every surface that shows a firm - the index, the deals
 * table, the estimator, the claim form - so a logo uploaded once appears
 * everywhere, and a firm without one degrades to the same two-letter tile
 * rather than to a broken image.
 *
 * A plain `<img>`, not `next/image`: the source is an admin-supplied URL that
 * may point at our own API or at the firm's CDN, and there is no fixed set of
 * hosts to configure. These are small square marks - the optimiser would buy
 * very little for the constraint it imposes.
 *
 * A URL that fails to load falls back to the monogram rather than rendering
 * the browser's broken-image glyph and alt text. An admin-supplied link can
 * rot at any time, and one dead logo in a row of cards makes the whole page
 * look broken - the tile is the same shape, so nothing shifts when it swaps.
 */
export function FirmMark({
  name,
  mark,
  logoUrl,
  size = 34,
  fluid = false,
  className,
}: {
  name: string;
  mark: string;
  logoUrl?: string | null;
  size?: number;
  /**
   * Let a wide logo stay wide. Most prop firms publish a horizontal wordmark,
   * and `object-contain` inside a square renders one at a quarter of the box
   * height - "LUCID TRADING" in a 44px tile is 11px tall and unreadable. Used
   * where the mark is the heading (cards), not where a column has to line up.
   */
  fluid?: boolean;
  className?: string;
}) {
  const shared = cn(
    "grid flex-none place-items-center overflow-hidden rounded-[10px] border border-hair bg-surface-2",
    className,
  );

  const [failed, setFailed] = useState(false);

  if (logoUrl && !failed) {
    return (
      <span
        className={shared}
        style={
          fluid
            ? { height: size, width: "100%", maxWidth: size * 3.4, paddingInline: 10, paddingBlock: 6 }
            : { width: size, height: size }
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- admin-supplied URL, no fixed host to configure */}
        <img
          src={logoUrl}
          alt={`${name} logo`}
          /* No width/height in fluid mode. The attributes stamp an intrinsic
             aspect ratio on the element, so `w-auto` derived a wide wordmark's
             width from a 1:1 box and clipped it - "LUCID TRADING" rendered as
             "LUCID" with the second line cut off. Without them the browser
             uses the image's own proportions, which is the whole point. */
          {...(fluid ? {} : { width: size, height: size })}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          /* Explicit pixels, not `height: 100%`. As a centred grid item the
             percentage did not resolve against the padded area - a 174x90
             logo stayed 90px tall inside a 58px tile and was clipped. A
             concrete cap plus object-contain fits any aspect ratio. */
          style={fluid ? { maxHeight: size - 12, maxWidth: "100%", width: "auto" } : undefined}
          /* `size-full` plus `object-contain` rather than max-height: a
             percentage max on a replaced element resolves against a box the
             image itself is sizing, so a 174x90 logo ignored it and overflowed
             a 58px tile. Filling the box and letting object-contain letterbox
             guarantees the whole mark is visible at its own proportions. */
          className={fluid ? "object-contain" : "size-full object-contain"}
        />
      </span>
    );
  }

  // Legible, not decorative. At `text-muted` on `surface-2` the monogram was
  // effectively invisible, so a firm whose logo URL had rotted rendered as an
  // empty tile - which reads as a failed image, exactly the thing this exists
  // to avoid.
  return (
    <span
      aria-hidden
      className={cn(
        shared,
        "bg-[linear-gradient(140deg,color-mix(in_oklab,var(--primary)_16%,var(--surface-2)),var(--surface-2))] font-mono font-semibold tracking-[0.06em] text-primary",
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.34) }}
    >
      {mark}
    </span>
  );
}
