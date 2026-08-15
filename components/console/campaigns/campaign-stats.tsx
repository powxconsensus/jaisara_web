"use client";

import { useState } from "react";
import {
  Badge,
  EmptyState,
  LoadingRows,
  Segmented,
  StatTile,
  TableShell,
  Td,
  Tr,
  type Tone,
} from "@/components/console/ui";
import { useResource } from "@/lib/resource";
import { dateTime } from "@/lib/console-format";
import type { CampaignDelivery, CampaignStats } from "@/lib/admin-types";

/**
 * Delivery outcomes.
 *
 * This was a `JSON.stringify` dump in a `<pre>`. Delivery numbers are the one
 * thing a marketer actually reads after a send, and a bounce rate worth acting
 * on should not have to be parsed out of braces.
 */

const DELIVERY_TONE: Record<CampaignDelivery["status"], Tone> = {
  SENT: "success",
  QUEUED: "neutral",
  BOUNCED: "danger",
  COMPLAINED: "danger",
  FAILED: "danger",
  SKIPPED: "warning",
};

type Filter = "all" | "BOUNCED" | "COMPLAINED" | "FAILED" | "SKIPPED";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "BOUNCED", label: "Bounced" },
  { value: "COMPLAINED", label: "Complaints" },
  { value: "FAILED", label: "Failed" },
  { value: "SKIPPED", label: "Skipped" },
];

export function CampaignStatsPanel({ campaignId }: { campaignId: string }) {
  const [filter, setFilter] = useState<Filter>("all");
  const stats = useResource<CampaignStats>(`/api/admin/marketing/campaigns/${campaignId}/stats`);
  const deliveries = useResource<CampaignDelivery[]>(
    `/api/admin/marketing/campaigns/${campaignId}/deliveries`,
    { query: { status: filter === "all" ? undefined : filter, take: 200 } },
  );

  const data = stats.data;
  const sent = data?.sent ?? 0;
  const rate = (value: number | undefined) =>
    sent > 0 && value !== undefined ? `${((value / sent) * 100).toFixed(1)}%` : "-";

  return (
    <div>
      {stats.loading && !data ? (
        <LoadingRows rows={2} />
      ) : (
        data && (
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            <StatTile label="SENT" value={data.sent} tone="success" />
            <StatTile
              label="OPENED"
              value={data.opened ?? "-"}
              hint={rate(data.opened)}
              tone="info"
            />
            <StatTile
              label="CLICKED"
              value={data.clicked ?? "-"}
              hint={rate(data.clicked)}
              tone="primary"
            />
            <StatTile
              label="BOUNCED"
              value={data.bounced}
              hint={rate(data.bounced)}
              tone={data.bounced > 0 ? "danger" : "neutral"}
            />
            <StatTile
              label="COMPLAINTS"
              value={data.complained}
              tone={data.complained > 0 ? "danger" : "neutral"}
              hint={
                data.complained > 0
                  ? "Each one suppresses that address permanently."
                  : undefined
              }
            />
            <StatTile label="QUEUED" value={data.queued} />
            <StatTile
              label="SKIPPED"
              value={data.skipped}
              hint="Suppressed, unverified or opted out at send time."
              tone={data.skipped > 0 ? "warning" : "neutral"}
            />
            <StatTile
              label="FAILED"
              value={data.failed}
              tone={data.failed > 0 ? "danger" : "neutral"}
            />
          </div>
        )
      )}

      <div className="mt-5 mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[9px] tracking-[0.18em] text-muted">PER RECIPIENT</p>
        <Segmented
          label="Filter deliveries"
          options={FILTERS}
          value={filter}
          onChange={setFilter}
        />
      </div>

      {deliveries.loading && !deliveries.data ? (
        <LoadingRows rows={4} />
      ) : (deliveries.data ?? []).length === 0 ? (
        <EmptyState
          title="Nothing to show"
          message={
            filter === "all"
              ? "No delivery rows recorded for this campaign yet."
              : "No recipients with that outcome - which is the result you want."
          }
        />
      ) : (
        <TableShell columns={["ADDRESS", "OUTCOME", "WHEN", "DETAIL"]} minWidth={720}>
          {(deliveries.data ?? []).map((delivery) => (
            <Tr key={`${delivery.email}-${delivery.status}`}>
              <Td className="font-mono text-[11.5px]">{delivery.email}</Td>
              <Td>
                <Badge tone={DELIVERY_TONE[delivery.status]}>{delivery.status}</Badge>
              </Td>
              <Td className="whitespace-nowrap text-muted">
                {dateTime(delivery.respondedAt ?? delivery.sentAt)}
              </Td>
              <Td className="max-w-[320px] text-[11.5px] text-muted">
                {delivery.skipReason ?? delivery.error ?? "-"}
              </Td>
            </Tr>
          ))}
        </TableShell>
      )}
    </div>
  );
}
