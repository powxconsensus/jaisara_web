"use client";

import Link from "next/link";
import { StatusPill } from "@/components/ui/status-pill";
import { RefreshButton } from "@/components/ui/refresh-button";
import { useResource } from "@/lib/resource";
import { shortDate } from "@/lib/console-format";

/**
 * What happened to the receipts a member submitted.
 *
 * Until now there was nowhere to look. Somebody uploaded a receipt, got a
 * confirmation, and then had no way to tell whether it was still queued, had
 * been matched, or had been rejected three weeks ago and why - so the only way
 * to find out was to open a support ticket, which is how a claims queue turns
 * into an inbox.
 *
 * The API already returned every field this needs, including the rejection
 * reason. Only the page was missing.
 *
 * Two states carry most of the confusion and are given real explanations rather
 * than a pill:
 *
 *  - `AWAITING_REPORT` looks like nothing is happening. It means we have the
 *    receipt and are waiting on the firm's own report, which arrives on the
 *    firm's schedule, not ours.
 *  - `APPROVED` with a pending conversion means the money is real but inside
 *    its hold period, so the wallet shows it as pending rather than available.
 */

interface ClaimRow {
  id: string;
  claimedExternalId: string | null;
  claimedAmount: string | null;
  claimedPurchaseAt: string | null;
  claimedProductText: string | null;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
  platform: { slug: string; name: string } | null;
  conversion: { id: string; status: string; holdUntil: string | null } | null;
}

/** Claim status → the pill vocabulary already used in the wallet. */
function pillFor(status: string): "Approved" | "Pending" | "Rejected" {
  if (status === "APPROVED") return "Approved";
  if (status === "REJECTED" || status === "DUPLICATE") return "Rejected";
  return "Pending";
}

/**
 * What the member should understand, in their words rather than the enum's.
 *
 * `DISPUTED` deliberately does not say "somebody else claimed this too". That
 * is true, and telling a member it would both accuse them and tell an actual
 * fraudster exactly which orders are contested.
 */
function explain(claim: ClaimRow): string {
  switch (claim.status) {
    case "AWAITING_REPORT":
      return "We have your receipt and are waiting for the firm to report the purchase. This runs on their schedule and can take a few days.";
    case "MATCHED":
      return "Matched to the firm's report and queued for a final check.";
    case "APPROVED":
      if (claim.conversion?.status === "REVERSED") {
        return "This was approved, but the purchase was later refunded or reversed at the firm, so the cashback was taken back.";
      }
      if (claim.conversion?.status === "PENDING") {
        return claim.conversion.holdUntil
          ? `Approved. The cashback is in your wallet as pending and becomes available on ${shortDate(claim.conversion.holdUntil)}.`
          : "Approved. The cashback is in your wallet as pending until its hold period ends.";
      }
      return "Approved and paid into your wallet.";
    case "REJECTED":
      return claim.rejectionReason ?? "This claim was not approved.";
    case "DUPLICATE":
      return "This order has already been claimed, so it cannot be claimed again.";
    case "DISPUTED":
      return "This one needs a person to look at it. Our team is reviewing it and will get back to you.";
    case "DRAFT":
      return "Started but never submitted.";
    default:
      return "In review.";
  }
}

export function ClaimsView() {
  /**
   * Cached for a minute, then refreshed behind the reader.
   *
   * This page is checked repeatedly and changes rarely - somebody waiting on a
   * decision opens it, leaves, and opens it again. Every one of those visits
   * used to be a fresh round trip that redrew the same three rows behind a
   * shimmer, because the fetch lived in a `useEffect` with `no-store` and so
   * ran on every mount by construction. Now the second visit paints from cache
   * with no request at all, and the refresh button is there for the member who
   * genuinely wants to ask again.
   */
  const resource = useResource<ClaimRow[]>("/api/claims", { query: { take: 50 } });
  const claims = resource.data;

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-3.5 font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
            [ Your claims ]
          </p>
          <h1 className="m-0 font-display text-[clamp(25px,3.3vw,34px)] font-black uppercase leading-none tracking-[-0.02em]">
            Every receipt you sent
          </h1>
        </div>
        <div className="flex items-center gap-2.5">
          <RefreshButton
            onRefresh={() => void resource.reload()}
            refreshing={resource.refreshing}
            fetchedAt={resource.fetchedAt}
          />
          <Link
            href="/dashboard/claim"
            className="rounded-[10px] bg-primary px-5 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-on-primary transition hover:brightness-[1.06]"
          >
            Submit a claim
          </Link>
        </div>
      </div>

      {claims === null && resource.error ? (
        /**
         * A failure must not read as "you have no claims".
         *
         * The previous version turned any non-2xx into an empty array, so an
         * API that was simply down told a member their receipts did not exist -
         * the single most alarming thing this page can say, and a support
         * ticket every time it happened.
         */
        <div className="rounded-card border border-hair bg-surface px-6 py-16 text-center">
          <p className="mb-2.5 font-mono text-[10px] tracking-[0.16em] text-warning">
            COULD NOT LOAD
          </p>
          <p className="mx-auto mb-5 max-w-[46ch] text-[12.5px] leading-6 text-muted">
            {resource.error} Your claims are safe - this page just could not reach them.
          </p>
          <button
            type="button"
            onClick={() => void resource.reload()}
            disabled={resource.refreshing}
            className="cursor-pointer rounded-[10px] border border-hair px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-primary transition hover:border-primary disabled:cursor-wait disabled:opacity-55"
          >
            {resource.refreshing ? "Trying…" : "Try again"}
          </button>
        </div>
      ) : claims === null ? (
        <div aria-busy className="space-y-2.5">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-[104px] animate-pulse rounded-card bg-surface-2" />
          ))}
        </div>
      ) : claims.length === 0 ? (
        <div className="rounded-card border border-hair bg-surface px-6 py-16 text-center">
          <p className="mb-2.5 font-mono text-[10px] tracking-[0.16em] text-muted">EMPTY</p>
          <p className="mb-1.5 text-sm font-semibold">No claims yet</p>
          <p className="mx-auto max-w-[46ch] text-[12.5px] leading-6 text-muted">
            Buy a challenge with a Jaisara coupon, then send us the receipt. Everything you submit
            shows up here with its status.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {claims.map((claim) => (
            <article
              key={claim.id}
              className="rounded-card border border-hair bg-surface p-[clamp(18px,2.5vw,24px)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-x-5 gap-y-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[14.5px] font-semibold">
                    {claim.platform?.name ?? "Unknown firm"}
                    {claim.claimedProductText && (
                      <span className="font-normal text-muted"> · {claim.claimedProductText}</span>
                    )}
                  </p>
                  <p className="mt-1.5 font-mono text-[9.5px] tracking-[0.02em] text-muted">
                    SENT {shortDate(claim.createdAt).toUpperCase()}
                    {claim.claimedExternalId && <> · ORDER {claim.claimedExternalId}</>}
                  </p>
                </div>
                <div className="flex flex-none items-center gap-3">
                  {claim.claimedAmount && (
                    <span data-count className="font-mono text-[13.5px]">
                      ${claim.claimedAmount}
                    </span>
                  )}
                  <StatusPill status={pillFor(claim.status)} />
                </div>
              </div>

              <p className="mt-3 border-t border-hair-soft pt-3 text-[12.5px] leading-[1.6] text-muted">
                {explain(claim)}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
