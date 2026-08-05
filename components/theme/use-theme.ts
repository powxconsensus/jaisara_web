"use client";

import { useSyncExternalStore } from "react";
import type { Mode, PaletteKey } from "@/lib/theme";
import {
  getPrefs,
  getServerPrefs,
  resetToDefault,
  setMode,
  setPalette,
  subscribe,
  toggleMode,
} from "@/lib/theme-store";

interface UseThemeResult {
  palette: PaletteKey;
  mode: Mode;
  /** False during SSR and hydration — guard palette-specific labels with it. */
  mounted: boolean;
  setPalette: (palette: PaletteKey) => void;
  setMode: (mode: Mode) => void;
  toggleMode: () => void;
  resetToDefault: () => void;
}

const subscribeToNothing = () => () => {};

/**
 * Reads theme prefs from the external store (localStorage). No context is
 * needed — every consumer subscribes to the same store, and the pre-paint
 * script in <head> has already applied both attributes before React runs.
 */
export function useTheme(): UseThemeResult {
  const prefs = useSyncExternalStore(subscribe, getPrefs, getServerPrefs);
  const mounted = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );

  return {
    palette: prefs.palette,
    mode: prefs.mode,
    mounted,
    setPalette,
    setMode,
    toggleMode,
    resetToDefault,
  };
}
