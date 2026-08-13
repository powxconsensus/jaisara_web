import Link from "next/link";
import { cn } from "@/lib/cn";
import { BrandMark } from "./brand-mark";

/**
 * The brand lockup, matching the official logo: mint mark, JAISARA in white,
 * CLUB ruled off beneath it in the accent.
 *
 * The mark is masked rather than imaged (see `brand-mark.tsx`), so it takes the
 * palette's accent instead of needing a dark plate behind it. Below `sm` the
 * wordmark drops and the mark stands alone.
 */
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
      aria-label="Jaisara Club home"
      className={cn("flex flex-none items-center gap-2.5 text-fg hover:text-fg", className)}
    >
      <BrandMark className="size-8 text-primary" />

      <span className="hidden flex-col sm:flex">
        <span className="font-display text-[13px] font-black uppercase leading-none tracking-[0.18em]">
          Jaisara
        </span>
        {/* The rules either side of CLUB are the logo's own device. They are
            hairlines rather than borders so they stay level with the cap
            height of the word between them. */}
        <span className="mt-[3px] flex items-center gap-1.5 text-primary">
          <span className="h-px w-2 bg-current opacity-70" />
          <span className="font-mono text-[7.5px] uppercase leading-none tracking-[0.34em]">
            Club
          </span>
          <span className="h-px flex-1 bg-current opacity-70" />
        </span>
      </span>
    </Link>
  );
}
