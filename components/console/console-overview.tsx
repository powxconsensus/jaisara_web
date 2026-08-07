"use client";

import Link from "next/link";
import { useAccess } from "@/components/console/use-permissions";
import { PageHeader, Panel, StatTile, Badge } from "@/components/console/ui";
import { useResource } from "@/lib/console-api";
import { CONSOLE_GROUPS, visibleSections } from "@/lib/console-nav";
import { humanRole } from "@/lib/console-format";
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
 * The point of this screen is the top row: what is waiting. A grid of links to
 * sections the person can already see in the sidebar tells them nothing, so
 * every tile here is a live count, fetched only when the permission for it is
 * actually held.
 */

/** The list endpoints cap their page size, so a full page means "at least". */
const CAP = 100;

function atLeast(rows: unknown[] | null): string {
  if (!rows) return "—";
  return rows.length >= CAP ? `${CAP}+` : String(rows.length);
}

export function ConsoleOverview() {
  const { can, roles, permissions } = useAccess();
  const sections = visibleSections(permissions);

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

  const tiles = [
    can(P.claimViewAll) && {
      label: "CLAIMS TO REVIEW",
      value: atLeast(claims.data),
      hint: "Matched to an order and waiting on a decision.",
      tone: (claims.data?.length ?? 0) > 0 ? ("warning" as const) : ("neutral" as const),
      href: "/console/claims",
    },
    can(P.claimViewAll) && {
      label: "AWAITING REPORT",
      value: atLeast(waiting.data),
      hint: "Submitted, but the firm has not reported the order yet.",
      tone: "neutral" as const,
      href: "/console/claims?status=AWAITING_REPORT",
    },
    can(P.withdrawalView) && {
      label: "PAYOUTS REQUESTED",
      value: atLeast(payouts.data),
      hint: "Members waiting to be paid.",
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
      value: subscribers.data ? subscribers.data.reachable.toLocaleString("en-US") : "—",
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

  const groups = CONSOLE_GROUPS.map((group) => ({
    group,
    items: sections.filter((section) => section.group === group),
  })).filter((entry) => entry.items.length > 0);

  return (
    <div>
      <PageHeader
        eyebrow="OVERVIEW"
        title="What needs you"
        description="Counts are live and scoped to your permissions. Anything hidden here is refused by the API too, so a role change takes effect immediately."
      />

      {tiles.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-2.5 lg:grid-cols-3 xl:grid-cols-5">
          {tiles.map((tile) => (
            <Link
              key={tile.label}
              href={tile.href}
              className="rounded-[14px] transition hover:-translate-y-0.5"
            >
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

      <Panel className="mb-5 p-[clamp(18px,3vw,26px)]">
        <p className="font-mono text-[9px] tracking-[0.2em] text-muted">YOUR ACCESS</p>
        <div className="mt-3.5 flex flex-wrap gap-2">
          {roles.map((role) => (
            <Badge key={role} tone="primary">
              {humanRole(role)}
            </Badge>
          ))}
          <Badge tone="neutral">{permissions.size} PERMISSIONS</Badge>
        </div>
      </Panel>

      {groups.map(({ group, items }) => (
        <div key={group} className="mb-6 last:mb-0">
          <p className="mb-3 font-mono text-[9px] tracking-[0.2em] text-primary">
            {group.toUpperCase()}
          </p>
          <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
            {items.map((section) => (
              <Link
                key={section.href}
                href={section.href}
                className="group rounded-[16px] border border-hair bg-surface p-5 transition hover:-translate-y-0.5 hover:border-primary"
              >
                <p className="flex items-center justify-between gap-3 font-display text-lg font-black uppercase group-hover:text-primary">
                  {section.label}
                  <span className="text-primary transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </p>
                <p className="mt-2.5 text-[12.5px] leading-6 text-muted">
                  {section.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
