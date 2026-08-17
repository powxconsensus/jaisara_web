"use client";

import { useSyncExternalStore } from "react";

import {
  consentServerSnapshot,
  consentSnapshot,
  subscribeConsent,
  writeConsent,
} from "@/lib/analytics-consent";

/**
 * The opt-out, somewhere it can be found on purpose.
 *
 * The banner asks once and then never returns, so without this the answer is
 * unchangeable - which makes it not really a choice. Withdrawing here calls
 * Clarity's own `consent(false)` through `ClarityAnalytics`, so it stops
 * collection in the current page rather than only declining to start next time.
 *
 * Shown on the account page, which is a route replay never runs on anyway: the
 * control is visible exactly where the recording is not.
 */
export function AnalyticsCard() {
  const consent = useSyncExternalStore(
    subscribeConsent,
    consentSnapshot,
    consentServerSnapshot,
  );

  const granted = consent === "granted";

  return (
    <section className="mb-4 rounded-[18px] border border-hair bg-surface p-[clamp(20px,3vw,26px)]">
      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
        Product analytics
      </p>
      <h2 className="mt-2 text-sm font-semibold">Help us find what is confusing</h2>
      <p className="mt-2 max-w-[62ch] text-[13px] leading-[1.7] text-muted">
        Microsoft Clarity records how people move through the{" "}
        <strong className="font-semibold">public</strong> pages, so we can see where
        the site is hard to use. It never runs on your dashboard, your claims, your
        receipts, or any signed-in page — including this one.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => writeConsent(granted ? "denied" : "granted")}
          className="cursor-pointer rounded-[10px] border border-hair bg-surface-2 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors hover:border-primary"
        >
          {granted ? "Turn off" : "Turn on"}
        </button>
        <span className="font-mono text-[9px] tracking-[0.12em] text-muted">
          {consent === null
            ? "NOT SET — OFF UNTIL YOU CHOOSE"
            : granted
              ? "ON FOR PUBLIC PAGES"
              : "OFF"}
        </span>
      </div>
    </section>
  );
}
