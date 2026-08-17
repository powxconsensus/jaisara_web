"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

import {
  consentServerSnapshot,
  consentSnapshot,
  subscribeConsent,
  writeConsent,
} from "@/lib/analytics-consent";
import { isAnalyticsAllowedOn } from "@/lib/analytics-routes";

/**
 * Asks once, on a page where the answer could matter.
 *
 * Deliberately not shown on `/dashboard` or `/console`: replay is disabled
 * there regardless of the answer, so asking would be requesting permission for
 * something that is not going to happen either way, and a banner over somebody's
 * wallet is an interruption bought with nothing.
 *
 * Both buttons are the same size and neither is styled as the preferred one.
 * A muted "decline" beside a bright "accept" is a dark pattern with a legal
 * problem attached - consent obtained that way is not freely given, which is
 * the standard this exists to meet.
 */
export function AnalyticsConsentBanner() {
  const consent = useSyncExternalStore(
    subscribeConsent,
    consentSnapshot,
    consentServerSnapshot,
  );
  const pathname = usePathname();

  // Undecided only. Once answered it never returns; the choice is changed from
  // the account page, where it can be found on purpose rather than by accident.
  if (consent !== null) return null;
  if (!isAnalyticsAllowedOn(pathname)) return null;

  return (
    <div
      role="dialog"
      aria-label="Analytics preference"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-[520px] rounded-[14px] border border-hair bg-surface p-4 shadow-lg [animation:jsUp_.4s_both]"
    >
      <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted">
        Analytics
      </p>
      <p className="mt-2 text-[13px] leading-[1.6] text-muted">
        We use Microsoft Clarity to see which parts of the public site people
        struggle with. It never runs on your dashboard, your receipts, or any
        signed-in page. You can change this later in your account settings.
      </p>
      <div className="mt-3.5 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => writeConsent("granted")}
          className="cursor-pointer rounded-[10px] border border-hair bg-surface-2 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors hover:border-primary"
        >
          Allow
        </button>
        <button
          type="button"
          onClick={() => writeConsent("denied")}
          className="cursor-pointer rounded-[10px] border border-hair bg-surface-2 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors hover:border-primary"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
