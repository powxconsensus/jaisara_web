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
   *
   * `size` is the box *height*; the caller sets the width with a class, so it
   * can be responsive. It used to be `width: 100%` capped at `size * 3.4`,
   * which in a flex row resolved against the whole row - a 150px logo slot on a
   * 375px phone, taking the space the firm name needed.
   */
  fluid?: boolean;
  className?: string;
}) {
  const shared = cn(
    "grid flex-none place-items-center overflow-hidden rounded-[10px] border border-hair bg-surface-2",
    className,
  );

  const [failed, setFailed] = useState(false);

  // Breathing room inside a fluid slot, and the amount the image has to give
  // back out of its own height. Declared once because the two must agree: the
  // cap is what actually sizes a wordmark, so a padding change that did not
  // reach it would either clip the logo or leave it floating in the tile.
  const inset = 5;

  if (logoUrl && !failed) {
    return (
      <span
        className={shared}
        style={
          fluid
            ? { height: size, paddingInline: inset * 2, paddingBlock: inset }
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
          style={fluid ? { maxHeight: size - inset * 2, maxWidth: "100%", width: "auto" } : undefined}
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
  //
  // It occupies the same box a logo would, fluid or not. A monogram shrunk to a
  // square inside a wide slot left a visible hole in the column and made rows
  // with a logo and rows without look like two different designs - the point of
  // a fallback is that nothing moves and nothing gapes when it swaps in.
  return (
    <span
      aria-hidden
      className={cn(
        shared,
        "bg-[linear-gradient(140deg,color-mix(in_oklab,var(--primary)_16%,var(--surface-2)),var(--surface-2))] font-mono font-semibold tracking-[0.06em] text-primary",
      )}
      style={{
        ...(fluid ? { height: size } : { width: size, height: size }),
        // Sized off the height either way. Scaling two letters to a wide slot
        // would print them larger than the wordmark they stand in for.
        fontSize: Math.round(size * 0.34),
      }}
    >
      {mark}
    </span>
  );
}
