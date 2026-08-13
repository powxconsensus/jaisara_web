import { brandMaskStyle } from "@/components/ui/brand-mark";

/**
 * The mark, painted on the wall at the back of the hero.
 *
 * ── Why it is not simply "the logo at low opacity" ────────────────────────
 *
 * It was, and it read as a decal stuck to the front of the screen. Four things
 * put an object in the distance, and low opacity is none of them:
 *
 *  1. **Occlusion.** This renders *before* `HeroAtmosphere`, so the wall grid,
 *     the ambient bloom and the motes all cross in front of it. Something the
 *     dust is floating in front of cannot read as near. Render order is the
 *     whole trick - move this after the atmosphere and it comes forward again.
 *  2. **Aerial perspective.** Distance eats contrast and pulls colour toward
 *     whatever the air is made of, so the fill is almost entirely `--bg` with
 *     a trace of accent, rather than the accent at low alpha. The difference
 *     is that this stays *behind* the background instead of glowing on top of
 *     it, on light palettes as well as dark.
 *  3. **Focus.** A heavy blur, because the camera is focused on the copy.
 *  4. **Light, not colour.** A wall is legible because light moves across it,
 *     and a flat shape at constant brightness reads as a sticker no matter how
 *     faint it is. The layer below runs a narrow highlight across the mark -
 *     and because the mask is applied over it, the light only ever appears
 *     *inside* the logo, travelling along the stroke.
 *
 * The mark is always visible on its own and the light is a pass over it. That
 * separation is the point: an earlier version leaned on the highlight to make
 * the shape legible at all, so between passes there was nothing on the wall.
 * Fading the base further is not the way to add depth - the blur, the render
 * order and the colour mix are.
 *
 * It is not decoration to be noticed. If you can identify it without going
 * looking for it, it is too strong.
 */
export function HeroWatermark() {
  /* Faded out toward the lower left, which is the corner the headline and the
     CTAs occupy. */
  const FADE = "linear-gradient(115deg, transparent, #000 44%, #000)";

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute left-[52%] top-[40%] aspect-square w-[min(96vw,820px)] -translate-x-1/2 -translate-y-1/2 blur-[7px] lg:left-[47%] lg:w-[min(62vw,940px)]"
        style={{ maskImage: FADE, WebkitMaskImage: FADE }}
      >
        {/* The mask is on the wrapper, so everything inside is clipped to the
            shape of the mark and the travelling light cannot escape it. */}
        <div className="relative size-full overflow-hidden" style={brandMaskStyle}>
          {/* The mark itself, always on. It has to carry the shape on its own:
              the light is a pass over it, not the thing that draws it. */}
          <div
            className="absolute inset-0"
            style={{ background: "color-mix(in oklab, var(--bg) 84%, var(--primary))" }}
          />
          {/* Exactly the width of the mark, so the keyframes' ±100% take it
              cleanly off each edge. The bright band is narrow - a highlight
              running along the stroke rather than a wash over the whole
              thing. */}
          <div
            className="absolute inset-0 motion-safe:[animation:jsWallLight_11s_linear_infinite]"
            style={{
              background:
                "linear-gradient(100deg, transparent 40%, color-mix(in oklab, var(--bg) 64%, var(--primary)) 50%, transparent 60%)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
