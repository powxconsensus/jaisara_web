/**
 * The plane the page stands on, for the length of the page.
 *
 * `PageAtmosphere` lights the top of an interior screen, and below it the
 * content column was landing on flat `--bg` - so a 1240px measure read as a
 * rectangle floating on nothing, and the gutters read as the page having run
 * out rather than as margin. The landing page never has that problem because
 * its grid, ground and motes all bleed to the window: the column there sits
 * inside an environment, and the width stops being a question.
 *
 * Two layers, both decorative:
 *  - the hero's 88px grid, kept to the gutters so it fills the margins without
 *    ever sitting behind a price,
 *  - a rule down each edge of the column, which is the part that answers the
 *    complaint directly: an edge with a line on it is a measure somebody chose,
 *    and an edge without one is just where the content happened to stop.
 *
 * No light pooling at the foot. The hero needs it because it ends in open
 * space; an interior page ends in the footer, and a glow above that reads as a
 * smudge in the gap rather than as a horizon.
 *
 * Masks nest rather than composite. The grid needs two of them - fade in below
 * the lit band, then fade out across the middle - and `mask-composite` is the
 * one part of this still worth avoiding; a wrapper carrying the vertical mask
 * over a child carrying the horizontal one multiplies them for free.
 */

/** Full strength at the window edges, gone across the content column. */
const GUTTERS =
  "linear-gradient(90deg, #000 0%, rgba(0,0,0,0.42) 28%, transparent 47%, transparent 53%, rgba(0,0,0,0.42) 72%, #000 100%)";

/** Nothing under the lit band, which draws its own; full strength below it. */
const BELOW_THE_BAND = "linear-gradient(180deg, transparent 0px, #000 640px)";

/** The rules start under the masthead and stop before the footer's own edge. */
const RULE_EXTENT =
  "linear-gradient(180deg, transparent 0px, #000 300px, #000 calc(100% - 160px), transparent 100%)";

export function PageField() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-x-clip">
      <div
        className="absolute inset-0"
        style={{ maskImage: BELOW_THE_BAND, WebkitMaskImage: BELOW_THE_BAND }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, color-mix(in oklab, var(--text) 5%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--text) 5%, transparent) 1px, transparent 1px)",
            backgroundSize: "88px 88px",
            maskImage: GUTTERS,
            WebkitMaskImage: GUTTERS,
          }}
        />
      </div>

      {/* Same width expression as the content column, so the rules land on its
          edges to the pixel - and therefore on the navbar's edges too.

          Desktop only. A rule marks a margin, and below `lg` there is no margin
          to mark: the gutter is 18px and a hairline that close to the bezel
          reads as a stray border on the viewport rather than as a measure. */}
      <div
        className="absolute inset-y-0 left-1/2 hidden w-[min(var(--maxw),calc(100%-2*var(--pad)))] -translate-x-1/2 border-x border-hair-soft lg:block"
        style={{ maskImage: RULE_EXTENT, WebkitMaskImage: RULE_EXTENT }}
      />
    </div>
  );
}
