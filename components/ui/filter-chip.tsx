import { cn } from "@/lib/cn";

/** A toolbar filter / sort chip. Mono variant is used for compact controls. */
export function FilterChip({
  active,
  onClick,
  mono,
  children,
}: {
  active: boolean;
  onClick: () => void;
  mono?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex-none cursor-pointer whitespace-nowrap rounded-[9px] border transition-all duration-[180ms]",
        mono ? "px-3 py-2 font-mono text-[11.5px]" : "px-3.5 py-[9px] text-[12.5px] font-medium",
        active
          ? "border-primary bg-[color-mix(in_oklab,var(--primary)_14%,transparent)] text-fg"
          : "border-hair text-muted hover:border-primary hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}
