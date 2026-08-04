"use client";

import { useState } from "react";
import { useToast } from "@/components/shell/toast";

/** Click-to-copy coupon field, styled as a dashed ticket stub. */
export function CopyCoupon({ code }: { code: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
      toast("Coupon copied");
    } catch {
      toast("Could not copy — select the code manually", "warning");
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="mb-3 flex w-full cursor-pointer items-center justify-between gap-3 rounded-[11px] border border-dashed bg-surface-2 px-4 py-3.5"
      style={{ borderColor: "color-mix(in oklab, var(--text) 20%, transparent)" }}
    >
      <span className="font-mono text-sm tracking-[0.12em]">{code}</span>
      <span className="font-mono text-[10px] tracking-[0.14em] text-primary">
        {copied ? "COPIED" : "COPY"}
      </span>
    </button>
  );
}
