/**
 * Palette metadata and theming rules (handoff §1.2, §1.3).
 *
 * Palette and mode are ORTHOGONAL. `data-theme` on <html> selects one of 16
 * families; `data-mode` selects light or dark. Every family defines both, so
 * all 32 combinations are valid - light/dark is not a pairing of two palettes
 * and toggling mode never changes which family you are on.
 *
 * The 16 families are a *selection aid* while the brand is undecided, not a
 * shipped feature. Once one is chosen, keep it and the switcher collapses to
 * the mode toggle. This module is the single source of the list; the
 * CSS-variable values live in `app/globals.css`.
 */

export type Mode = "light" | "dark";

export type PaletteKey =
  | "jaisara"
  | "teal"
  | "light"
  | "obsidian"
  | "indigo"
  | "sand"
  | "lime"
  | "violet"
  | "ember"
  | "ice"
  | "magenta"
  | "aurora"
  | "crimson"
  | "mono"
  | "terminal"
  | "frost";

/** [background, primary, club] - the three colours a preview tile needs. */
export type Swatch = readonly [string, string, string];

export interface PaletteMeta {
  key: PaletteKey;
  name: string;
  /** Character, without a light/dark prefix - mode is its own control now. */
  tag: string;
  /** The side this family was authored on; the default mode on first load. */
  nativeMode: Mode;
  dark: Swatch;
  light: Swatch;
}

/**
 * Whatever this is, its values must also be the `:root` block in globals.css -
 * that block is what a visitor with JS disabled gets, since the theme script
 * never runs to set `data-theme` for them.
 */
export const DEFAULT_PALETTE: PaletteKey = "jaisara";

/**
 * Deep Teal and Bright Turquoise are both turquoise and shipped byte-identical
 * in light mode once. They are deliberately separated here: #eff6f4/#0c6e63
 * against #f3fbf9/#0a8073. Re-measure contrast if either is retuned - every
 * light accent must clear 4.5:1 on white, since the primary CTA is 12px/600.
 */
export const PALETTES: PaletteMeta[] = [
  { key: "jaisara", name: "Jaisara Club", tag: "Official logo", nativeMode: "dark",
    dark: ["#01050e", "#99e1d9", "#e4c590"], light: ["#f1f6f7", "#0b6e63", "#a8791f"] },
  { key: "teal", name: "Deep Teal", tag: "Signature", nativeMode: "dark",
    dark: ["#0b3037", "#99e1d9", "#e4c590"], light: ["#eff6f4", "#0c6e63", "#b07d2a"] },
  { key: "light", name: "Bright Turquoise", tag: "Airy", nativeMode: "light",
    dark: ["#071f23", "#5fe3d2", "#e4c590"], light: ["#f3fbf9", "#0a8073", "#a8791f"] },
  { key: "obsidian", name: "Obsidian Mint", tag: "High contrast", nativeMode: "dark",
    dark: ["#0a0f0e", "#7fe9c3", "#e4c590"], light: ["#f1f5f3", "#0b7a5a", "#a87b24"] },
  { key: "indigo", name: "Midnight Indigo", tag: "Cool", nativeMode: "dark",
    dark: ["#0c1020", "#a8b8ff", "#e4c590"], light: ["#f1f3fb", "#3b4bc8", "#a87b24"] },
  { key: "sand", name: "Sand & Pine", tag: "Warm", nativeMode: "light",
    dark: ["#0d0b07", "#8fd8a8", "#e4c590"], light: ["#f4f1ea", "#14584a", "#96681a"] },
  { key: "lime", name: "Acid Lime", tag: "High energy", nativeMode: "dark",
    dark: ["#080a07", "#c6f24e", "#e4c590"], light: ["#f4f7ec", "#4e7a0b", "#a87b24"] },
  { key: "violet", name: "Cyber Violet", tag: "Electric", nativeMode: "dark",
    dark: ["#07050f", "#b27dff", "#f0c97a"], light: ["#f5f2fc", "#6b2ed1", "#a0741f"] },
  { key: "ice", name: "Ion Blue", tag: "Glacial", nativeMode: "dark",
    dark: ["#05090c", "#4fd4ff", "#e4c590"], light: ["#eff5fa", "#0a6e96", "#a87b24"] },
  { key: "aurora", name: "Aurora", tag: "Neon mint", nativeMode: "dark",
    dark: ["#040c0c", "#3df2b6", "#e4c590"], light: ["#eef8f5", "#04815e", "#a87b24"] },
  { key: "magenta", name: "Neon Magenta", tag: "Loud", nativeMode: "dark",
    dark: ["#0a060a", "#ff5cc8", "#f0c97a"], light: ["#fbf1f8", "#c01a86", "#a0741f"] },
  { key: "ember", name: "Ember", tag: "Warm amber", nativeMode: "dark",
    dark: ["#0b0705", "#ff9f45", "#e4c590"], light: ["#fbf4ee", "#c2560a", "#a87b24"] },
  { key: "crimson", name: "Crimson Carbon", tag: "Aggressive", nativeMode: "dark",
    dark: ["#0a0607", "#ff5a6e", "#e4c590"], light: ["#fcf1f2", "#c41f35", "#a87b24"] },
  { key: "terminal", name: "Terminal", tag: "Phosphor", nativeMode: "dark",
    dark: ["#020604", "#37ff8b", "#d9c27a"], light: ["#eff7f1", "#06713c", "#8a6e2f"] },
  { key: "mono", name: "Monochrome", tag: "Pure neutral", nativeMode: "dark",
    dark: ["#0a0a0a", "#ffffff", "#c9a96a"], light: ["#f4f4f4", "#101010", "#8a6e2f"] },
  { key: "frost", name: "Frost", tag: "Cobalt", nativeMode: "dark",
    dark: ["#060a11", "#7fb4ff", "#e4c590"], light: ["#f2f5f9", "#2e5bff", "#9a6f1e"] },
];

const BY_KEY = new Map(PALETTES.map((p) => [p.key, p]));

export function isPaletteKey(value: unknown): value is PaletteKey {
  return typeof value === "string" && BY_KEY.has(value as PaletteKey);
}

export function isMode(value: unknown): value is Mode {
  return value === "light" || value === "dark";
}

export function paletteMeta(key: PaletteKey): PaletteMeta {
  return BY_KEY.get(key) ?? PALETTES[0];
}

/** Mode a family opens in when the user has never chosen one. */
export function nativeMode(key: PaletteKey): Mode {
  return paletteMeta(key).nativeMode;
}

export function swatchFor(meta: PaletteMeta, mode: Mode): Swatch {
  return mode === "light" ? meta.light : meta.dark;
}

/**
 * Preview-tile surface/hairline derived from the swatch so a tile looks like
 * the product, not a colour sample (handoff §4.9): dark = background lifted
 * 16% toward white; light = white with a hairline.
 */
export function tileColors(swatch: Swatch, mode: Mode) {
  const [bg] = swatch;
  const isLight = mode === "light";
  return {
    bg,
    surface: isLight ? "#ffffff" : `color-mix(in oklab, ${bg} 84%, #ffffff)`,
    line: isLight
      ? `color-mix(in oklab, ${bg} 62%, #000000)`
      : `color-mix(in oklab, ${bg} 58%, #ffffff)`,
  };
}

/** localStorage keys (handoff §1.3) - one per axis, plus the account override. */
export const PALETTE_STORAGE_KEY = "jaisara-theme";
export const MODE_STORAGE_KEY = "jaisara-mode";
export const ACCOUNT_PALETTE_STORAGE_KEY = "jaisara-theme-user";

export interface ThemePrefs {
  palette: PaletteKey;
  mode: Mode;
}

export const DEFAULT_PREFS: ThemePrefs = {
  palette: DEFAULT_PALETTE,
  mode: nativeMode(DEFAULT_PALETTE),
};
