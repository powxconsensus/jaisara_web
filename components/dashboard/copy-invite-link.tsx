"use client";

import { useState } from "react";
import { useToast } from "@/components/shell/toast";

/** The invite link field with its gold copy button beside it. */
export function CopyInviteLink({ link }: { link: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`https://${link}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      toast("Invite link copied");
    } catch {
      toast("Could not copy — select the link manually", "warning");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div
        className="flex min-w-[240px] flex-1 items-center gap-3 rounded-[11px] border border-hair px-4 py-3.5"
        style={{ background: "color-mix(in oklab, var(--bg) 82%, transparent)" }}
      >
        <span className="flex-1 truncate font-mono text-[13px]">{link}</span>
      </div>
      <button
        type="button"
        onClick={copy}
        className="flex-none cursor-pointer rounded-[11px] bg-club px-[22px] py-3.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] transition hover:-translate-y-px hover:brightness-105"
        style={{ color: "#20160A" }}
      >
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
