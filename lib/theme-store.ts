import {
  DEFAULT_PREFS,
  LIGHT_PALETTES,
  THEME_STORAGE_KEY,
  isPaletteKey,
  modeOf,
  type PaletteKey,
  type ThemePrefs,
} from "./theme";

/**
 * Theme persistence, kept outside React so the provider can read it with
 * `useSyncExternalStore` — no state-in-effect, and other tabs stay in sync.
 *
 * `getSnapshot` must be referentially stable between changes, so the parsed
 * prefs are cached and only invalidated on write or a `storage` event.
 */

let cache: ThemePrefs | null = null;
const listeners = new Set<() => void>();

function readFromStorage(): ThemePrefs {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ThemePrefs>;
      if (isPaletteKey(parsed.palette)) {
        return {
          palette: parsed.palette,
          lastDark: isPaletteKey(parsed.lastDark) ? parsed.lastDark : DEFAULT_PREFS.lastDark,
          lastLight: isPaletteKey(parsed.lastLight) ? parsed.lastLight : DEFAULT_PREFS.lastLight,
        };
      }
    }
  } catch {
    /* private mode / disabled storage */
  }
  return DEFAULT_PREFS;
}

function emit() {
  for (const listener of listeners) listener();
}

export function getPrefs(): ThemePrefs {
  cache ??= readFromStorage();
  return cache;
}

/** During SSR and hydration, always the brand default. */
export function getServerPrefs(): ThemePrefs {
  return DEFAULT_PREFS;
}

export function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function write(next: ThemePrefs) {
  cache = next;
  document.documentElement.setAttribute("data-theme", next.palette);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  emit();
}

/** Choose a palette, remembering it as the last pick on its own side. */
export function setPalette(palette: PaletteKey) {
  const prev = getPrefs();
  write(
    LIGHT_PALETTES.has(palette)
      ? { palette, lastLight: palette, lastDark: prev.lastDark }
      : { palette, lastDark: palette, lastLight: prev.lastLight },
  );
}

/** Flip light ⇄ dark, returning to the previous pick on the other side. */
export function toggleMode() {
  const prev = getPrefs();
  write({
    ...prev,
    palette: modeOf(prev.palette) === "dark" ? prev.lastLight : prev.lastDark,
  });
}

/** Clear the override and return to the brand default. */
export function resetToDefault() {
  write(DEFAULT_PREFS);
}

/** Keep other tabs in sync with this one. */
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== THEME_STORAGE_KEY) return;
    cache = readFromStorage();
    document.documentElement.setAttribute("data-theme", cache.palette);
    emit();
  });
}
