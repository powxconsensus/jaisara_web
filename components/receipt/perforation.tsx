import { cn } from "@/lib/cn";

/**
 * A dashed fold line with a punched notch at each end. The notches are circles
 * filled with the page background, so they read as holes in the paper.
 */
export function Perforation({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)} aria-hidden="true">
      <div
        className="border-t-2 border-dashed"
        style={{ borderColor: "color-mix(in oklab, var(--text) 16%, transparent)" }}
      />
      <span className="absolute -left-[9px] -top-[9px] size-[18px] rounded-full bg-bg" />
      <span className="absolute -right-[9px] -top-[9px] size-[18px] rounded-full bg-bg" />
    </div>
  );
}
