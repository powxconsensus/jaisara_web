/**
 * Palette metadata and theming rules (handoff §1.2, §1.3).
 *
 * The 15 palettes are a *selection aid* while the brand is undecided — not a
 * shipped feature. Once a palette is chosen, keep two (one dark, one light) and
 * the switcher collapses to a mode toggle. This module is the single source of
 * that list; the CSS-variable values live in `app/globals.css`.
 */

export type Mode = "light" | "dark";

export type PaletteKey =
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

export interface PaletteMeta {
  key: PaletteKey;
  name: string;
  tag: string;
  mode: Mode;
  /** [background, primary, club] — for preview swatches. */
  swatch: [string, string, string];
}

/** The three light palettes; everything else is dark. */
export const LIGHT_PALETTES = new Set<PaletteKey>(["light", "sand", "frost"]);

export const DEFAULT_PALETTE: PaletteKey = "teal";
/** The light partner used when a user toggles to light mode from the default. */
export const DEFAULT_LIGHT_PALETTE: PaletteKey = "light";

export const PALETTES: PaletteMeta[] = [
  { key: "teal", name: "Deep Teal", tag: "Dark · signature", mode: "dark", swatch: ["#0B3037", "#99E1D9", "#E4C590"] },
  { key: "light", name: "Turquoise Light", tag: "Light · airy", mode: "light", swatch: ["#EFF6F4", "#0C6E63", "#B07D2A"] },
  { key: "obsidian", name: "Obsidian Mint", tag: "Dark · high contrast", mode: "dark", swatch: ["#0A0F0E", "#7FE9C3", "#E4C590"] },
  { key: "indigo", name: "Midnight Indigo", tag: "Dark · cool", mode: "dark", swatch: ["#0C1020", "#A8B8FF", "#E4C590"] },
  { key: "sand", name: "Sand & Pine", tag: "Light · warm", mode: "light", swatch: ["#F4F1EA", "#14584A", "#96681A"] },
  { key: "lime", name: "Acid Lime", tag: "Dark · high energy", mode: "dark", swatch: ["#080A07", "#C6F24E", "#E4C590"] },
  { key: "violet", name: "Cyber Violet", tag: "Dark · electric", mode: "dark", swatch: ["#07050F", "#B27DFF", "#F0C97A"] },
  { key: "ice", name: "Ion Blue", tag: "Dark · glacial", mode: "dark", swatch: ["#05090C", "#4FD4FF", "#E4C590"] },
  { key: "aurora", name: "Aurora", tag: "Dark · neon mint", mode: "dark", swatch: ["#040C0C", "#3DF2B6", "#E4C590"] },
  { key: "magenta", name: "Neon Magenta", tag: "Dark · loud", mode: "dark", swatch: ["#0A060A", "#FF5CC8", "#F0C97A"] },
  { key: "ember", name: "Ember", tag: "Dark · warm amber", mode: "dark", swatch: ["#0B0705", "#FF9F45", "#E4C590"] },
  { key: "crimson", name: "Crimson Carbon", tag: "Dark · aggressive", mode: "dark", swatch: ["#0A0607", "#FF5A6E", "#E4C590"] },
  { key: "terminal", name: "Terminal", tag: "Dark · phosphor", mode: "dark", swatch: ["#020604", "#37FF8B", "#D9C27A"] },
  { key: "mono", name: "Monochrome", tag: "Dark · pure neutral", mode: "dark", swatch: ["#0A0A0A", "#FFFFFF", "#C9A96A"] },
  { key: "frost", name: "Frost", tag: "Light · cobalt", mode: "light", swatch: ["#F2F5F9", "#2E5BFF", "#9A6F1E"] },
];

const PALETTE_KEYS = new Set(PALETTES.map((p) => p.key));

export function isPaletteKey(value: unknown): value is PaletteKey {
  return typeof value === "string" && PALETTE_KEYS.has(value as PaletteKey);
}

export function modeOf(palette: PaletteKey): Mode {
  return LIGHT_PALETTES.has(palette) ? "light" : "dark";
}

/**
 * Preview-tile surface/hairline derived per palette so a tile looks like the
 * product, not a colour sample (handoff §4.9): dark = background lifted 16%
 * toward white; light = white with a hairline.
 */
export function tileColors(meta: PaletteMeta) {
  const [bg] = meta.swatch;
  const isLight = meta.mode === "light";
  return {
    bg,
    surface: isLight ? "#FFFFFF" : `color-mix(in oklab, ${bg} 84%, #FFFFFF)`,
    line: isLight
      ? `color-mix(in oklab, ${bg} 62%, #000000)`
      : `color-mix(in oklab, ${bg} 58%, #FFFFFF)`,
  };
}

/** localStorage key for device-level persistence (handoff §1.3). */
export const THEME_STORAGE_KEY = "jaisara-theme";

export interface ThemePrefs {
  palette: PaletteKey;
  lastDark: PaletteKey;
  lastLight: PaletteKey;
}

export const DEFAULT_PREFS: ThemePrefs = {
  palette: DEFAULT_PALETTE,
  lastDark: DEFAULT_PALETTE,
  lastLight: DEFAULT_LIGHT_PALETTE,
};
