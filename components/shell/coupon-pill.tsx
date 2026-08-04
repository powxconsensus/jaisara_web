"use client";

import { useCallback, useRef, useState } from "react";
import { HEADER_COUPON } from "@/lib/nav";
import { cn } from "@/lib/cn";
import { CheckIcon, CopyIcon } from "@/components/ui/icons";
import { useToast } from "./toast";

/**
 * Click-to-copy coupon pill in the navbar. Tinted with the primary accent at
 * low opacity, so it reads as an affordance without competing with the CTA.
 */
export function CouponPill({ className }: { className?: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(HEADER_COUPON);
      if (timer.current) clearTimeout(timer.current);
      setCopied(true);
      timer.current = setTimeout(() => setCopied(false), 1600);
      toast("Coupon copied");
    } catch {
      toast("Could not copy — select the code manually", "warning");
    }
  }, [toast]);

  return (
    <button
      type="button"
      onClick={copy}
      title="Copy your coupon code"
      className={cn(
        "flex h-9 flex-none cursor-pointer items-center gap-2 rounded-[10px] border py-0 pl-3 pr-1.5 transition",
        className,
      )}
      style={{
        borderColor: "color-mix(in oklab, var(--primary) 45%, transparent)",
        background: "color-mix(in oklab, var(--primary) 10%, transparent)",
      }}
    >
      {/* Label hides on narrow navbars, where the code alone is enough. */}
      <span className="hidden font-mono text-[9.5px] tracking-[0.16em] text-muted lg:inline">
        CODE
      </span>
      <span className="font-mono text-xs tracking-[0.12em] text-primary">{HEADER_COUPON}</span>
      <span
        className="grid size-6 place-items-center rounded-[7px] text-primary"
        style={{ background: "color-mix(in oklab, var(--primary) 16%, transparent)" }}
      >
        {copied ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
      </span>
    </button>
  );
}
