import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/cn";

/** Compact brand mark on mobile, mark plus wordmark where space allows. */
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
      <Image
        src="/assets/brand/jaisara-mark.png"
        width={760}
        height={760}
        alt=""
        className="size-9 rounded-[10px] bg-[#02070e] object-contain p-[5px]"
      />
      <span className="hidden font-display text-sm font-black uppercase tracking-[0.12em] sm:inline">
        Jaisara
      </span>
    </Link>
  );
}
