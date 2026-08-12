import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * One estimator step: a mono label that carries its own state.
 *
 * A completed step shows a check and the chosen value in the label
 * (`01 / PROP FIRM - FTMO ✓`) and is clickable to change. A locked step is
 * visibly locked and states its prerequisite (handoff §5).
 */
export function StepShell({
  index,
  title,
  chosen,
  lockedHint,
  onReopen,
  children,
}: {
  /** Two-digit step number, e.g. "02". */
  index: string;
  title: string;
  /** The chosen value, shown in the label once the step is complete. */
  chosen?: string | null;
  /** Why the step is locked, e.g. "PICK THE CHALLENGE FIRST". */
  lockedHint?: string;
  /** Makes a completed step clickable to change. */
  onReopen?: () => void;
  children: ReactNode;
}) {
  const locked = Boolean(lockedHint);
  const label = `${index} / ${title}${chosen ? ` - ${chosen.toUpperCase()} ✓` : ""}`;

  return (
    <div>
      <div className="mb-3.5 flex items-center gap-2.5">
        {onReopen && chosen ? (
          <button
            type="button"
            onClick={onReopen}
            className="cursor-pointer font-mono text-[9.5px] tracking-[0.22em] text-muted transition-colors hover:text-fg"
          >
            {label}
          </button>
        ) : (
          <span
            className={cn(
              "font-mono text-[9.5px] tracking-[0.22em]",
              locked ? "text-[color-mix(in_oklab,var(--text-muted)_55%,transparent)]" : "text-muted",
            )}
          >
            {label}
          </span>
        )}
        {lockedHint && (
          <span className="font-mono text-[9px] tracking-[0.1em] text-muted">- {lockedHint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

/** Dashed placeholders shown in place of a locked step's options. */
export function LockedOptions({ count, width }: { count: number; width?: string }) {
  return (
    <div className="pointer-events-none mb-6 flex gap-[7px] opacity-[0.35]">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className={cn(
            "rounded-[10px] border border-dashed border-hair p-[11px] text-center text-[12.5px] text-muted",
            width ?? "flex-1",
          )}
        >
          -
        </div>
      ))}
    </div>
  );
}

/** A selectable option chip used by the type / size / tier steps. */
export function OptionChip({
  selected,
  onClick,
  className,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "cursor-pointer rounded-[10px] border px-4 py-2.5 text-[12.5px] font-medium transition-all duration-[180ms]",
        selected
          ? "border-primary bg-[color-mix(in_oklab,var(--primary)_14%,transparent)] text-fg"
          : "border-hair text-muted hover:border-primary hover:text-fg",
        className,
      )}
    >
      {children}
    </button>
  );
}
