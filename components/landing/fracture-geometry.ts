/**
 * Geometry for the ledger fracture (handoff, Hero spec).
 *
 * When the receipt lands, the floor cracks. Twenty shards radiate from the
 * contact point at irregular angles — four long dominant runs that carry a
 * branch, six mid-runs, and ten short splinters. Each shard is a `clip-path`
 * polygon that tapers from wide at the origin to a point at the tip, with its
 * own jitter, so no two are alike.
 *
 * The angles and lengths below are the layout and come from the prototype
 * verbatim; the per-shard jitter is generated here from a fixed seed. Fixed,
 * not random: the same polygon must be produced on the server and on the
 * client or hydration mismatches, and a fracture that redraws itself on every
 * render reads as noise rather than damage.
 *
 * All measurements are percentages of the shard's own box. The shard rotates
 * about `0 50%`, so 0% is the contact point and 100% is the tip.
 */

export interface Branch {
  /** Where along the parent run the branch splits off. */
  left: number;
  width: number;
  height: number;
  angle: number;
  polygon: string;
}

export interface Fracture {
  angle: number;
  /** Length as a share of the impact field's width. */
  width: number;
  height: number;
  /** The seam itself. */
  polygon: string;
  /** A thinner, brighter core that flashes at the moment of impact. */
  hotPolygon: string;
  branch: Branch | null;
}

/** Deterministic PRNG (mulberry32) — same sequence everywhere, forever. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BASE_HALF = 40;
const TIP_HALF = 2.6;
/** How fast the shard narrows. Below ~1.3 it reads as a wedge, not a crack. */
const TAPER = 1.5;

function pct(value: number): string {
  return `${Number(value.toFixed(1))}%`;
}

/**
 * A tapering jagged sliver. `thin` scales the half-thickness without moving the
 * centre line, so the hot core sits exactly inside the seam it belongs to.
 */
function sliver(seed: number, columns: number, thin = 1): string {
  const random = seeded(seed);
  const top: string[] = [];
  const bottom: string[] = [];
  let centre = 50;

  for (let i = 0; i < columns; i++) {
    const t = i / (columns - 1);
    const half =
      (TIP_HALF + (BASE_HALF - TIP_HALF) * (1 - t) ** TAPER + (random() - 0.5) * 10 * (1 - t)) *
      thin;
    // The centre wanders so the seam never looks ruled.
    centre = Math.min(58, Math.max(34, centre + (random() - 0.62) * 7));
    const x = pct(t * 100);
    top.push(`${x} ${pct(Math.max(0, centre - half))}`);
    bottom.unshift(`${x} ${pct(Math.min(100, centre + half))}`);
  }

  return `polygon(${[...top, ...bottom].join(", ")})`;
}

/** [angle, length %, height px, branch angle | null] — the fracture layout. */
const LAYOUT: [number, number, number, number | null][] = [
  [-171, 50, 21, -27],
  [-152, 18, 11, null],
  [-138, 32, 16, null],
  [-116, 43, 19, 31],
  [-99, 15, 11, null],
  [-83, 28, 14, null],
  [-58, 54, 22, -27],
  [-41, 17, 11, null],
  [-27, 35, 17, null],
  [-11, 22, 13, null],
  [6, 46, 20, -27],
  [22, 14, 10, null],
  [39, 30, 15, null],
  [57, 19, 12, null],
  [76, 48, 20, -27],
  [94, 16, 11, null],
  [112, 33, 16, null],
  [133, 25, 14, null],
  [152, 44, 19, -27],
  [168, 17, 11, null],
];

/** Dominant runs get more columns, so their jitter has room to read. */
const COLUMNS_DOMINANT = 16;
const COLUMNS_MINOR = 11;

export const FRACTURES: Fracture[] = LAYOUT.map(([angle, width, height, branchAngle], i) => {
  const seed = 0x1a15 + i * 977;
  const columns = branchAngle === null ? COLUMNS_MINOR : COLUMNS_DOMINANT;
  return {
    angle,
    width,
    height,
    polygon: sliver(seed, columns),
    hotPolygon: sliver(seed, columns, 0.5),
    branch:
      branchAngle === null
        ? null
        : {
            left: 44 + (i % 3) * 9,
            width: Math.round(width * 0.42),
            height: Math.round(height * 0.56),
            angle: branchAngle,
            polygon: sliver(seed + 331, 9),
          },
  };
});

/** Debris that arcs out of the seam, lifts off the plane and settles. */
export interface Chip {
  angle: number;
  /** How far it travels, px. */
  distance: number;
  width: number;
}

const CHIP_ANGLES = [-163, -127, -104, -69, -34, -8, 24, 63, 101, 139, 157];
const CHIP_DISTANCES = [128, 84, 146, 94, 136, 70, 124, 82, 142, 90, 116];
const CHIP_WIDTHS = [3.5, 5.5, 7.5, 9.5];

export const CHIPS: Chip[] = CHIP_ANGLES.map((angle, i) => ({
  angle,
  distance: CHIP_DISTANCES[i],
  width: CHIP_WIDTHS[i % CHIP_WIDTHS.length],
}));

/** Chips lie on the floor, so they read as flattened by the viewing angle. */
export const CHIP_ASPECT = 0.575;
