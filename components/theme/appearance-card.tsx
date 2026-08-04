"use client";

import { PALETTES, type Mode } from "@/lib/theme";
import { useTheme } from "./use-theme";
import { PalettePreviewTile } from "./palette-preview-tile";

const RULES: { mode: Mode; heading: string }[] = [
  { mode: "dark", heading: "Dark" },
  { mode: "light", heading: "Light" },
];

/**
 * Appearance settings (handoff §4.9) — the only place a user manages the
 * palette long-term; the navbar control is a quick switch.
 *
 * Tiles are split under DARK and LIGHT rules with no toggle and no hidden
 * state. When the brand palette is finally chosen this whole section reduces
 * to a single light/dark control — which is why it is a self-contained card
 * that the profile card knows nothing about.
 */
export function AppearanceCard() {
  const { palette, mounted, setPalette, resetToDefault } = useTheme();

  return (
    <section className="rounded-[18px] border border-hair bg-surface p-[clamp(20px,3vw,28px)]">
      <h2 className="mb-1.5 font-mono text-[9.5px] tracking-[0.22em] text-muted">APPEARANCE</h2>
      <p className="mb-5 text-[13px] leading-[1.6] text-muted">
        Each tile is the real interface rendered in that palette, so you can judge it without
        applying it.
      </p>

      {RULES.map((rule) => (
        <div key={rule.mode} className="mb-6 last:mb-0">
          <div className="mb-3 flex items-center gap-3">
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted">
              {rule.heading}
            </span>
            <span className="h-px flex-1 bg-hair-soft" />
          </div>
          <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fill,minmax(158px,1fr))]">
            {PALETTES.filter((p) => p.mode === rule.mode).map((p) => (
              <PalettePreviewTile
                key={p.key}
                palette={p}
                active={mounted && palette === p.key}
                onSelect={() => setPalette(p.key)}
              />
            ))}
          </div>
        </div>
      ))}

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
