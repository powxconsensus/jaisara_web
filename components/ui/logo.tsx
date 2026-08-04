import Link from "next/link";
import { cn } from "@/lib/cn";

/** The Jaisara mark: a turquoise `J` tile + wordmark. Placeholder for a real logo. */
export function Logo({
  href = "/",
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label="Jaisara home"
      className={cn("flex flex-none items-center gap-2.5 text-fg hover:text-fg", className)}
    >
      <span className="grid size-[26px] place-items-center rounded-[8px] bg-primary font-display text-sm font-black text-on-primary">
        J
      </span>
      <span className="font-display text-sm font-black uppercase tracking-[0.12em]">Jaisara</span>
    </Link>
  );
}
