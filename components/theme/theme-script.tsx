import {
  ACCOUNT_PALETTE_STORAGE_KEY,
  DEFAULT_PALETTE,
  MODE_STORAGE_KEY,
  PALETTE_STORAGE_KEY,
  PALETTES,
} from "@/lib/theme";

/** Families whose bare CSS block is the light one - they open in light mode. */
const LIGHT_FIRST = PALETTES.filter((p) => p.nativeMode === "light").map((p) => p.key);

/**
 * Blocking inline script that applies both theme axes to <html> before first
 * paint, so there's no flash of the default (handoff §1.3). Kept tiny and
 * dependency-free because it's stringified into the document. An unknown
 * palette falls back to the :root (Jaisara Club) block in CSS.
 */
const script = `(function(){var d=document.documentElement;try{
var p=localStorage.getItem(${JSON.stringify(ACCOUNT_PALETTE_STORAGE_KEY)})||localStorage.getItem(${JSON.stringify(PALETTE_STORAGE_KEY)})||${JSON.stringify(DEFAULT_PALETTE)};
var m=localStorage.getItem(${JSON.stringify(MODE_STORAGE_KEY)})||(${JSON.stringify(LIGHT_FIRST)}.indexOf(p)>-1?"light":"dark");
d.setAttribute("data-theme",p);d.setAttribute("data-mode",m);
}catch(e){d.setAttribute("data-theme",${JSON.stringify(DEFAULT_PALETTE)});d.setAttribute("data-mode","dark");}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
