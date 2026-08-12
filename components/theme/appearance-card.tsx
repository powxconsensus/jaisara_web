"use client";

import { PALETTES } from "@/lib/theme";
import { useTheme } from "./use-theme";
import { PalettePreviewTile } from "./palette-preview-tile";

/**
 * Appearance settings (handoff §4.9) - the only place a user manages the
 * palette long-term; the navbar control is a quick switch.
 *
 * ONE grid of 15 tiles, headed with the mode it is previewing. Do not split it
 * back into DARK and LIGHT sections: that split stopped meaning anything once
 * every family gained both sides. Mode is the toggle above, not a heading.
 *
 * When the brand palette is finally chosen this whole section reduces to that
 * single light/dark control - which is why it is a self-contained card that the
 * profile card knows nothing about.
 */
export function AppearanceCard() {
  const { palette, mode, mounted, setPalette, setMode, resetToDefault } = useTheme();

  return (
    <section className="rounded-[18px] border border-hair bg-surface p-[clamp(20px,3vw,28px)]">
      <h2 className="mb-1.5 font-mono text-[9.5px] tracking-[0.22em] text-muted">APPEARANCE</h2>
      <p className="mb-5 text-[13px] leading-[1.6] text-muted">
        Mode and palette are independent - every palette has a light and a dark side. Each tile is
        the real interface in that palette, so you can judge it without applying it.
      </p>

      <div className="mb-6 flex items-center gap-1.5 rounded-[11px] border border-hair p-1">
        {(["light", "dark"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setMode(option)}
            aria-pressed={mounted && mode === option}
            className="flex-1 cursor-pointer rounded-[8px] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted transition aria-[pressed=true]:bg-surface-2 aria-[pressed=true]:text-fg"
          >
            {option}
          </button>
        ))}
      </div>

      <div className="mb-3 flex items-center gap-3">
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted">
          Palettes · {mode}
        </span>
        <span className="h-px flex-1 bg-hair-soft" />
      </div>
      <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fill,minmax(158px,1fr))]">
        {PALETTES.map((p) => (
          <PalettePreviewTile
            key={p.key}
            palette={p}
            mode={mode}
            active={mounted && palette === p.key}
            onSelect={() => setPalette(p.key)}
          />
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-hair-soft pt-4">
        <p className="font-mono text-[9.5px] tracking-[0.12em] text-muted">SAVED ON THIS DEVICE</p>
        <button
          type="button"
          onClick={resetToDefault}
          className="cursor-pointer rounded-[9px] border border-hair px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition hover:border-primary hover:text-fg"
        >
          Reset to Jaisara default
        </button>
      </div>
    </section>
  );
}
