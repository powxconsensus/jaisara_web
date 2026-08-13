"use client";

import Link from "next/link";
import { PageHeader, Panel, StatTile, Badge } from "@/components/console/ui";
import { useAccess } from "@/components/console/use-permissions";
import { useResource } from "@/lib/console-api";
import { pointsToUsd, relativeTime, usd } from "@/lib/console-format";
import {
  ADMIN_PERMISSIONS as P,
  type ClaimSummary,
  type Product,
  type SubscriberSummary,
  type Withdrawal,
} from "@/lib/admin-types";

/**
 * Where a reviewer lands.
 *
 * Two things only: what is waiting, and the oldest of it. The previous version
 * spent two thirds of the screen on a grid of cards linking to sections that
 * are already listed in the rail, one row away - a menu printed twice. The
 * queue below replaces it, because the useful question on opening a console is
 * never "what sections exist", it is "what has been sitting here longest".
 *
 * Every tile is a live count, fetched only when the permission for it is held.
 */

/** The list endpoints cap their page size, so a full page means "at least". */
const CAP = 100;

function atLeast(rows: unknown[] | null): string {
  if (!rows) return "-";
  return rows.length >= CAP ? `${CAP}+` : String(rows.length);
}

/** One line of work, whatever kind of work it is. */
interface QueueRow {
  kind: "CLAIM" | "PAYOUT";
  href: string;
  title: string;
  meta: string;
  at: string;
  tone: "warning" | "info";
}

export function ConsoleOverview() {
  const { can, roles, permissions } = useAccess();

  const claims = useResource<ClaimSummary[]>("/api/admin/claims", {
    query: { status: "MATCHED", take: CAP },
    enabled: can(P.claimViewAll),
  });
  const waiting = useResource<ClaimSummary[]>("/api/admin/claims", {
    query: { status: "AWAITING_REPORT", take: CAP },
    enabled: can(P.claimViewAll),
  });
  const payouts = useResource<Withdrawal[]>("/api/admin/payouts", {
    query: { status: "REQUESTED" },
    enabled: can(P.withdrawalView),
  });
  const unmapped = useResource<Product[]>("/api/admin/catalog/products/unmapped", {
    enabled: can(P.productView),
  });
  const subscribers = useResource<SubscriberSummary>("/api/admin/marketing/subscribers", {
    enabled: can(P.marketingView),
  });

  const owedPoints = (payouts.data ?? []).reduce(
    (total, row) => total + Number(row.points || 0),
    0,
  );

  const tiles = [
    can(P.claimViewAll) && {
      label: "CLAIMS TO REVIEW",
      value: atLeast(claims.data),
      hint: "Matched to an order, waiting on a decision.",
      tone: (claims.data?.length ?? 0) > 0 ? ("warning" as const) : ("neutral" as const),
      href: "/console/claims",
    },
    can(P.claimViewAll) && {
      label: "AWAITING REPORT",
      value: atLeast(waiting.data),
      hint: "Submitted; the firm has not reported the order yet.",
      tone: "neutral" as const,
      href: "/console/claims?status=AWAITING_REPORT",
    },
    can(P.withdrawalView) && {
      label: "PAYOUTS REQUESTED",
      value: atLeast(payouts.data),
      hint: owedPoints > 0 ? `${pointsToUsd(owedPoints)} in total.` : "Nobody is waiting to be paid.",
      tone: (payouts.data?.length ?? 0) > 0 ? ("info" as const) : ("neutral" as const),
      href: "/console/payouts",
    },
    can(P.productView) && {
      label: "UNMAPPED PRODUCTS",
      value: atLeast(unmapped.data),
      hint: "Imported names with no challenge behind them.",
      tone: (unmapped.data?.length ?? 0) > 0 ? ("warning" as const) : ("neutral" as const),
      href: "/console/catalog",
    },
    can(P.marketingView) && {
      label: "REACHABLE MEMBERS",
      value: subscribers.data ? subscribers.data.reachable.toLocaleString("en-US") : "-",
      hint: "Active, verified and opted in.",
      tone: "neutral" as const,
      href: "/console/campaigns",
    },
  ].filter(Boolean) as {
    label: string;
    value: string;
    hint: string;
    tone: "neutral" | "warning" | "info";
    href: string;
  }[];

  /**
   * Claims and payouts interleaved, oldest first.
   *
   * Merged rather than shown as two lists because they compete for the same
   * attention and the same person: a payout that has waited two days outranks
   * a claim from this morning, and two separate lists hide that ordering.
   */
  const queue: QueueRow[] = [
    ...(claims.data ?? []).map(
      (claim): QueueRow => ({
        kind: "CLAIM",
        href: `/console/claims?claim=${claim.id}`,
        title: `${claim.platform.name} · ${claim.claimedExternalId}`,
        meta: [claim.user.email, claim.claimedAmount ? usd(claim.claimedAmount) : null]
          .filter(Boolean)
          .join(" · "),
        at: claim.createdAt,
        tone: "warning",
      }),
    ),
    ...(payouts.data ?? []).map(
      (payout): QueueRow => ({
        kind: "PAYOUT",
        href: "/console/payouts",
        title: `Withdrawal · ${pointsToUsd(payout.points)}`,
        meta: [payout.user.email, payout.payoutAddress?.chain ?? payout.method]
          .filter(Boolean)
          .join(" · "),
        at: payout.requestedAt,
        tone: "info",
      }),
    ),
  ]
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
    .slice(0, 14);

  const loading = claims.loading || payouts.loading;

  return (
    // `flex-1` claims the shell's spare height so the queue panel below can
    // fill it; an empty queue then centres its message instead of leaving a
    // band of dead page under a short card.
    <div className="flex flex-1 flex-col">
      <PageHeader
        eyebrow="OVERVIEW"
        title="What needs you"
        description="Counts are live and scoped to your permissions - anything hidden here is refused by the API too, so a role change takes effect immediately."
        actions={
          <div className="flex items-center gap-1.5">
            {roles.map((role) => (
              <Badge key={role} tone="primary">
                {role.replace(/_/g, " ")}
              </Badge>
            ))}
            <Badge tone="neutral">{permissions.size} PERMS</Badge>
          </div>
        }
      />

      {tiles.length > 0 && (
        <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
          {tiles.map((tile) => (
            <Link key={tile.label} href={tile.href} className="block h-full transition hover:opacity-90">
              <StatTile
                label={tile.label}
                value={tile.value}
                hint={tile.hint}
                tone={tile.tone}
              />
            </Link>
          ))}
        </div>
      )}

      <Panel className="flex flex-1 flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--console-hair)] px-3 py-2">
          <div className="flex items-baseline gap-2">
            <h2 className="text-[length:var(--ct-title)] font-semibold leading-none">Your queue</h2>
            <span className="font-mono text-[length:var(--ct-label)] tracking-[0.16em] text-muted">
              OLDEST FIRST
            </span>
          </div>
          <span className="font-mono text-[length:var(--ct-label)] tracking-[0.14em] text-muted">
            {queue.length > 0 ? `${queue.length} SHOWN` : ""}
          </span>
        </div>

        {loading && queue.length === 0 ? (
          <div aria-hidden className="space-y-1.5 p-1.5">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="h-[34px] animate-pulse rounded-[7px] bg-surface-2" />
            ))}
          </div>
        ) : queue.length === 0 ? (
          <p className="px-3 py-8 text-center text-[length:var(--ct-small)] text-muted">
            Nothing is waiting. Claims and payouts appear here the moment they arrive.
          </p>
        ) : (
          <ul>
            {queue.map((row, index) => (
              <li key={`${row.kind}-${row.href}-${index}`}>
                <Link
                  href={row.href}
                  className="flex items-center gap-3 border-b border-hair-soft px-3 py-[7px] transition last:border-b-0 hover:bg-surface-2/60"
                >
                  <Badge tone={row.tone}>{row.kind}</Badge>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[length:var(--ct-body)]">{row.title}</span>
                    <span className="block truncate font-mono text-[length:var(--ct-label)] tracking-[0.06em] text-muted">
                      {row.meta}
                    </span>
                  </span>
                  <span className="flex-none font-mono text-[length:var(--ct-label)] tracking-[0.1em] text-muted">
                    {relativeTime(row.at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
