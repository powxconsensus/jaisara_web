import {
  ACCOUNT_PALETTE_STORAGE_KEY,
  DEFAULT_PREFS,
  MODE_STORAGE_KEY,
  PALETTE_STORAGE_KEY,
  isMode,
  isPaletteKey,
  nativeMode,
  type Mode,
  type PaletteKey,
  type ThemePrefs,
} from "./theme";

/**
 * Theme persistence, kept outside React so the provider can read it with
 * `useSyncExternalStore` - no state-in-effect, and other tabs stay in sync.
 *
 * The two axes are stored under separate keys and never touch each other:
 * choosing a palette preserves the mode, toggling the mode preserves the
 * palette. Only when the user has *never* set a mode do we fall back to the
 * family's native side.
 *
 * `getSnapshot` must be referentially stable between changes, so the parsed
 * prefs are cached and only invalidated on write or a `storage` event.
 */

let cache: ThemePrefs | null = null;
const listeners = new Set<() => void>();

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; /* private mode / disabled storage */
  }
}

function readFromStorage(): ThemePrefs {
  const stored = read(ACCOUNT_PALETTE_STORAGE_KEY) ?? read(PALETTE_STORAGE_KEY);
  const palette: PaletteKey = isPaletteKey(stored) ? stored : DEFAULT_PREFS.palette;
  const storedMode = read(MODE_STORAGE_KEY);
  return { palette, mode: isMode(storedMode) ? storedMode : nativeMode(palette) };
}

function emit() {
  for (const listener of listeners) listener();
}

function apply(prefs: ThemePrefs) {
  const root = document.documentElement;
  root.setAttribute("data-theme", prefs.palette);
  root.setAttribute("data-mode", prefs.mode);
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

function write(next: ThemePrefs, persist: () => void) {
  cache = next;
  apply(next);
  try {
    persist();
  } catch {
    /* ignore */
  }
  emit();
}

/** Choose a palette family. The mode is untouched. */
export function setPalette(palette: PaletteKey, signedIn = false) {
  write({ ...getPrefs(), palette }, () => {
    localStorage.setItem(PALETTE_STORAGE_KEY, palette);
    if (signedIn) localStorage.setItem(ACCOUNT_PALETTE_STORAGE_KEY, palette);
  });
}

/** Choose light or dark. The palette family is untouched. */
export function setMode(mode: Mode) {
  write({ ...getPrefs(), mode }, () => localStorage.setItem(MODE_STORAGE_KEY, mode));
}

export function toggleMode() {
  setMode(getPrefs().mode === "dark" ? "light" : "dark");
}

/** Clear the account override and return to the brand default on both axes. */
export function resetToDefault() {
  write(DEFAULT_PREFS, () => {
    localStorage.removeItem(ACCOUNT_PALETTE_STORAGE_KEY);
    localStorage.setItem(PALETTE_STORAGE_KEY, DEFAULT_PREFS.palette);
    localStorage.setItem(MODE_STORAGE_KEY, DEFAULT_PREFS.mode);
  });
}

/** Keep other tabs in sync with this one. */
if (typeof window !== "undefined") {
  const KEYS = [PALETTE_STORAGE_KEY, MODE_STORAGE_KEY, ACCOUNT_PALETTE_STORAGE_KEY];
  window.addEventListener("storage", (event) => {
    if (event.key !== null && !KEYS.includes(event.key)) return;
    cache = readFromStorage();
    apply(cache);
    emit();
  });
}
