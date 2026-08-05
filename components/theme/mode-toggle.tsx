"use client";

import { useTheme } from "./use-theme";

/**
 * Light ⇄ dark toggle. It flips `data-mode` only — the palette family is
 * preserved, because the two are independent axes (handoff §1.3). Every family
 * defines both sides, so there is nothing to remember and nothing to pair.
 */
export function ModeToggle() {
  const { mode, toggleMode, mounted } = useTheme();
  const next = mode === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={toggleMode}
      title="Toggle light / dark"
      aria-label={mounted ? `Switch to ${next} mode` : "Toggle light or dark mode"}
      className="flex size-9 flex-none cursor-pointer items-center justify-center rounded-[10px] border border-hair transition hover:border-primary"
    >
      {/* Half-filled disc: a mode metaphor that needs no icon font. */}
      <span
        className="size-3.5 rounded-full border border-hair"
        style={{ background: "linear-gradient(90deg, var(--text) 50%, var(--bg) 50%)" }}
      />
    </button>
  );
}
