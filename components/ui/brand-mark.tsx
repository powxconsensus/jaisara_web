import { cn } from "@/lib/cn";

/**
 * The JC mark, painted rather than placed.
 *
 * The supplied artwork (`jaisara-mark.png`) is flattened onto its own opaque
 * near-black background, so dropping it in as an `<img>` means shipping a dark
 * plate that only looks right on dark palettes - which is why the old navbar
 * logo carried a hardcoded `#02070e` swatch behind it.
 *
 * `jaisara-mark-mask.png` is the same artwork reduced to an alpha channel, so
 * the mark is *filled* with `currentColor` instead. One asset, correct on all
 * 16 palettes and both modes, and it inherits whatever accent the surface
 * around it is using.
 */
const MASK = "url('/assets/brand/jaisara-mark-mask.png')";

/** Mask plumbing, shared with the hero watermark, which sizes its own box. */
export const brandMaskStyle = {
  maskImage: MASK,
  WebkitMaskImage: MASK,
  maskSize: "contain",
  WebkitMaskSize: "contain",
  maskRepeat: "no-repeat",
  WebkitMaskRepeat: "no-repeat",
  maskPosition: "center",
  WebkitMaskPosition: "center",
} as const;

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("block bg-current", className)}
      style={brandMaskStyle}
    />
  );
}
