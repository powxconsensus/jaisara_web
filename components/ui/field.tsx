import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Mono uppercase field label. */
export function FieldLabel({
  children,
  htmlFor,
  action,
}: {
  children: ReactNode;
  htmlFor?: string;
  /** Optional right-aligned control, e.g. "FORGOT?". */
  action?: ReactNode;
}) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <label htmlFor={htmlFor} className="font-mono text-[9.5px] tracking-[0.16em] text-muted">
        {children}
      </label>
      {action}
    </div>
  );
}

/** Text input with the shared focus ring. */
export function TextInput({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "w-full rounded-[11px] border border-hair bg-surface-2 px-[15px] py-3.5 text-sm outline-none transition focus:border-primary focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_18%,transparent)] disabled:cursor-not-allowed disabled:opacity-55",
        className,
      )}
      {...props}
    />
  );
}
