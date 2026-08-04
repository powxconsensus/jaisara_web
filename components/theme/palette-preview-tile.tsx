"use client";

import { tileColors, type PaletteMeta } from "@/lib/theme";
import { CheckIcon } from "@/components/ui/icons";

/**
 * A palette rendered as a **miniature of the real interface**, not a swatch
 * chip (handoff §4.9): a mini nav bar, a card showing a figure in that
 * palette's accent, a primary button and a club-gold dot — all on the
 * palette's true background.
 *
 * The point is that a user can judge a theme without applying it.
 */
export function PalettePreviewTile({
  palette,
  active,
  onSelect,
}: {
  palette: PaletteMeta;
  active: boolean;
  onSelect: () => void;
}) {
  const { bg, surface, line } = tileColors(palette);
  const [, primary, club] = palette.swatch;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className="cursor-pointer rounded-[14px] border p-2 text-left transition-transform duration-200 hover:-translate-y-0.5"
      style={{ borderColor: active ? "var(--primary)" : "var(--hair)" }}
    >
      <div className="overflow-hidden rounded-[10px]" style={{ background: bg }}>
        {/* Mini nav bar */}
        <div
          className="flex items-center gap-1 px-2 py-1.5"
          style={{ borderBottom: `1px solid ${line}` }}
        >
          <span className="size-2 rounded-[3px]" style={{ background: primary }} />
          <span className="h-1 w-6 rounded-full" style={{ background: line }} />
          <span className="ml-auto h-1 w-3 rounded-full" style={{ background: line }} />
        </div>

        {/* Mini card with a figure in the accent */}
        <div className="p-2">
          <div
            className="rounded-[7px] p-2"
            style={{ background: surface, border: `1px solid ${line}` }}
          >
            <span className="block h-1 w-8 rounded-full" style={{ background: line }} />
            <span
              className="mt-1.5 block font-mono text-[11px] leading-none"
              style={{ color: primary }}
            >
              $184.50
            </span>
          </div>

          <div className="mt-1.5 flex items-center gap-1.5">
            <span
              className="h-3.5 flex-1 rounded-[5px]"
              style={{ background: primary }}
              aria-hidden="true"
            />
            <span className="size-2 flex-none rounded-full" style={{ background: club }} />
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-1.5 px-0.5">
        <span className="min-w-0 flex-1 truncate text-[12px] font-medium">{palette.name}</span>
        {active && <CheckIcon size={13} className="flex-none text-primary" />}
      </div>
      <p className="px-0.5 font-mono text-[8.5px] tracking-[0.08em] text-muted">{palette.tag}</p>
    </button>
  );
}
