"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/auth-context";

/**
 * The full-bleed "Get paid" band above the footer links.
 *
 * It sits on every page, including the dashboard, and used to send everybody to
 * `/signup` - so a signed-in member scrolling their own wallet was invited to
 * open a second account. The words stay; only where they lead changes, and for
 * somebody signed in the honest destination is the thing the band is promising.
 *
 * The eyebrow changes with it. "No card, no minimum" is a signup objection
 * being answered; to a member already holding a balance it is answering a
 * question nobody asked.
 */
export function FooterBand() {
  const { status } = useAuth();
  const signedIn = status === "authenticated";

  return (
    <Link
      href={signedIn ? "/dashboard/withdraw" : "/signup"}
      className="group block cursor-pointer border-t border-hair text-fg"
      prefetch={false}
    >
      <div className="mx-auto flex max-w-[var(--maxw)] flex-wrap items-center justify-between gap-[18px] px-[var(--pad)] py-[clamp(34px,7vw,84px)] transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)] group-hover:translate-x-3">
        <div>
          <p className="mb-[18px] font-mono text-[10px] tracking-[0.24em] text-muted">
            {signedIn ? "USDT OR GIFT CARDS" : "FREE ACCOUNT, NO CARD"}
          </p>
          <p className="font-display text-[clamp(40px,8vw,104px)] font-black uppercase leading-[0.9] tracking-[-0.025em]">
            Get <span className="text-primary">paid</span>
            <span className="font-serif text-primary italic font-normal normal-case">.</span>
          </p>
        </div>
        <span className="grid size-[clamp(56px,7vw,84px)] flex-none place-items-center rounded-[18px] border border-hair text-[clamp(22px,3vw,32px)] text-primary">
          ↗
        </span>
      </div>
    </Link>
  );
}
