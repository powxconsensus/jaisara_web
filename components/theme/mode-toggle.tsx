"use client";

import { useTheme } from "./use-theme";

/**
 * Light ⇄ dark toggle. Mode remembers the last dark and last light palette
 * independently, so toggling returns to the user's previous pick on that side
 * (handoff §1.3) — the pairing logic lives in the theme store.
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
