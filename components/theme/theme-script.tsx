import { DEFAULT_PALETTE, THEME_STORAGE_KEY } from "@/lib/theme";

/**
 * Blocking inline script that applies the persisted palette to <html> before
 * first paint, so there's no flash of the default theme (handoff §1.3). Kept
 * tiny and dependency-free because it's stringified into the document. An
 * unknown value simply falls back to the :root (teal) palette in CSS.
 */
const script = `(function(){try{var p=${JSON.stringify(DEFAULT_PALETTE)};var raw=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(raw){var v=JSON.parse(raw);if(v&&typeof v.palette==="string")p=v.palette;}document.documentElement.setAttribute("data-theme",p);}catch(e){document.documentElement.setAttribute("data-theme",${JSON.stringify(
  DEFAULT_PALETTE,
)});}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
