import { Slot } from "@radix-ui/react-slot";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap font-mono font-semibold uppercase tracking-[0.13em] transition disabled:pointer-events-none disabled:opacity-50";

const variantClass: Record<Variant, string> = {
  // Filled CTAs lift and brighten on hover; shadows stay neutral (handoff §6).
  primary: "rounded-btn bg-primary text-on-primary hover:-translate-y-0.5 hover:brightness-[1.08]",
  outline: "rounded-btn border border-hair text-fg hover:border-primary",
  ghost: "text-muted hover:text-fg",
};

const sizeClass: Record<Size, string> = {
  sm: "h-8 px-3 text-[10px]",
  md: "h-9 px-4 text-[11px]", // 36px — the navbar control height
  lg: "h-11 px-5 text-xs",
};

export interface ButtonProps extends ComponentProps<"button"> {
  variant?: Variant;
  size?: Size;
  /** Render as the single child element (e.g. a Next.js <Link>). */
  asChild?: boolean;
}

/** Shared button. Use `asChild` to project the styles onto a `<Link>`. */
export function Button({
  variant = "primary",
  size = "md",
  asChild = false,
  className,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(base, variantClass[variant], sizeClass[size], className)} {...props} />;
}
