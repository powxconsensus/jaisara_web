"use client";

import { useSyncExternalStore } from "react";
import { modeOf, type Mode, type PaletteKey } from "@/lib/theme";
import {
  getPrefs,
  getServerPrefs,
  resetToDefault,
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
  toggleMode: () => void;
  resetToDefault: () => void;
}

const subscribeToNothing = () => () => {};

/**
 * Reads theme prefs from the external store (localStorage). No context is
 * needed — every consumer subscribes to the same store, and the pre-paint
 * script in <head> has already applied `data-theme` before React runs.
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
    mode: modeOf(prefs.palette),
    mounted,
    setPalette,
    toggleMode,
    resetToDefault,
  };
}
