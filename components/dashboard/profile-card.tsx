"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { ACCOUNT, CLUB } from "@/lib/data/wallet";
import { useToast } from "@/components/shell/toast";

/** Initials from the display name, for the avatar monogram. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Profile settings (handoff §4.9). Independent of the appearance card. */
export function ProfileCard() {
  const { toast } = useToast();
  const [name, setName] = useState(ACCOUNT.displayName);
  const [email, setEmail] = useState(ACCOUNT.email);
  const nameId = useId();
  const emailId = useId();

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(ACCOUNT.referralCode);
      toast("Referral code copied");
    } catch {
      toast("Could not copy — select it manually", "warning");
    }
  };

  return (
    <section className="mb-4 rounded-[18px] border border-hair bg-surface p-[clamp(20px,3vw,26px)]">
      <h2 className="mb-5 font-mono text-[9.5px] tracking-[0.22em] text-muted">PROFILE</h2>

      <div className="mb-6 flex items-center gap-4">
        {/* Monogram derives from the display name as it is edited. */}
        <span
          className="grid size-14 flex-none place-items-center rounded-[16px] font-display text-[19px] font-black text-primary"
          style={{ background: "color-mix(in oklab, var(--primary) 18%, var(--surface-2))" }}
        >
          {initials(name) || "?"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold tracking-[-0.01em]">
            {name || "Your name"}
          </p>
          <p className="mt-[5px] font-mono text-[10px] tracking-[0.1em] text-muted">
            MEMBER SINCE MAY 2026 · CLUB TIER {CLUB.tier}
          </p>
        </div>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          toast("Changes saved");
        }}
      >
        {/* All four controls share one two-column grid, so the referral code
            and payout default sit in line with the name and email. */}
        <div className="grid gap-3.5 md:grid-cols-2">
          <div>
            <label
              htmlFor={nameId}
              className="mb-[7px] block font-mono text-[9px] tracking-[0.14em] text-muted"
            >
              DISPLAY NAME
            </label>
            <input
              id={nameId}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-[10px] border border-hair bg-surface-2 px-3.5 py-3 text-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <label
              htmlFor={emailId}
              className="mb-[7px] block font-mono text-[9px] tracking-[0.14em] text-muted"
            >
              EMAIL
            </label>
            <input
              id={emailId}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-[10px] border border-hair bg-surface-2 px-3.5 py-3 text-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <p className="mb-[7px] font-mono text-[9px] tracking-[0.14em] text-muted">
              YOUR REFERRAL CODE
            </p>
            <button
              type="button"
              onClick={copyCode}
              className="flex w-full cursor-pointer items-center justify-between gap-2.5 rounded-[10px] border border-dashed border-hair bg-surface-2 px-3.5 py-3 transition hover:border-club"
            >
              <span className="font-mono text-[13px] tracking-[0.1em] text-club">
                {ACCOUNT.referralCode}
              </span>
              <span className="font-mono text-[9px] tracking-[0.14em] text-muted">COPY</span>
            </button>
          </div>

          <div>
            <p className="mb-[7px] font-mono text-[9px] tracking-[0.14em] text-muted">
              PAYOUT DEFAULT
            </p>
            <div className="flex items-center justify-between gap-2.5 rounded-[10px] border border-hair bg-surface-2 px-3.5 py-3">
              <span className="text-sm">USDT · TRC-20</span>
              <Link
                href="/dashboard/withdraw"
                className="font-mono text-[9px] tracking-[0.14em] text-primary"
              >
                CHANGE
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2.5">
          <button
            type="submit"
            className="cursor-pointer rounded-[10px] bg-primary px-[22px] py-3 font-mono text-[11px] tracking-[0.14em] text-on-primary transition hover:brightness-[1.06]"
          >
            SAVE CHANGES
          </button>
        </div>
      </form>
    </section>
  );
}
