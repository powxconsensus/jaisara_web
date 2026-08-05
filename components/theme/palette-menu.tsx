"use client";

import * as Popover from "@radix-ui/react-popover";
import { PALETTES, paletteMeta, swatchFor } from "@/lib/theme";
import { useTheme } from "./use-theme";

/**
 * Quick palette switcher in the navbar. Radix Popover handles the dismiss
 * behaviour with `pointerdown` semantics, avoiding the "every interaction takes
 * two clicks" bug a document-level click listener caused (handoff §6).
 *
 * Swatches preview the *current mode*, because that is what picking one will
 * give you — the mode toggle beside it is the other axis and is not touched.
 *
 * This is the *quick* switch — Account → Appearance is where a user manages the
 * palette long-term. Both disappear once the brand palette is chosen.
 */
export function PaletteMenu() {
  const { palette, mode, setPalette, mounted } = useTheme();
  const active = paletteMeta(palette);

  return (
    <Popover.Root>
      <Popover.Trigger
        title="Choose a palette"
        className="flex h-9 cursor-pointer items-center gap-2 rounded-[10px] border border-hair px-[11px] transition hover:border-primary"
      >
        <span className="flex flex-none">
          <span className="size-2.5 rounded-[3px] border border-hair bg-bg" />
          <span className="-ml-[3px] size-2.5 rounded-[3px] bg-primary" />
          <span className="-ml-[3px] size-2.5 rounded-[3px] bg-club" />
        </span>
        <span className="hidden whitespace-nowrap font-mono text-[10px] tracking-[0.12em] text-muted lg:inline">
          {mounted ? active.name : "Palette"}
        </span>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={10}
          className="z-[240] max-h-[min(66vh,520px)] w-[270px] overflow-y-auto rounded-[14px] border border-hair bg-surface p-2 shadow-card [animation:jsIn_.2s_ease_both]"
        >
          <p className="px-2.5 pb-2.5 pt-2 font-mono text-[9px] tracking-[0.22em] text-muted">
            PALETTE // {PALETTES.length}
          </p>
          <div className="flex flex-col gap-0.5">
            {PALETTES.map((p) => {
              const [bg, primary, club] = swatchFor(p, mode);
              return (
              <button
                key={p.key}
                type="button"
                onClick={() => setPalette(p.key)}
                aria-current={p.key === palette}
                className="flex min-h-11 cursor-pointer items-center gap-[11px] rounded-[9px] p-2.5 text-left transition hover:bg-surface-2 aria-[current=true]:bg-surface-2"
              >
                <span className="flex flex-none gap-[3px]">
                  <span
                    className="h-[18px] w-3 rounded-[4px] border border-hair"
                    style={{ background: bg }}
                  />
                  <span className="h-[18px] w-3 rounded-[4px]" style={{ background: primary }} />
                  <span className="h-[18px] w-3 rounded-[4px]" style={{ background: club }} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold">{p.name}</span>
                  <span className="mt-0.5 block font-mono text-[9px] tracking-[0.06em] text-muted">
                    {p.tag}
                  </span>
                </span>
                {p.key === palette && (
                  <span className="size-1.5 flex-none rounded-[2px] bg-primary" />
                )}
              </button>
              );
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
