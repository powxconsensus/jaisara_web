"use client";

import { useState } from "react";
import { FilterChip } from "@/components/ui/filter-chip";
import {
  Badge,
  EmptyState,
  ErrorNote,
  LoadingRows,
  PageHeader,
  Panel,
  PanelHeader,
  Select,
  StatTile,
  TableShell,
  Td,
  Tr,
  type Tone,
} from "@/components/console/ui";
import { useAccess } from "@/components/console/use-permissions";
import { InfiniteScrollSentinel } from "@/components/console/infinite-scroll";
import { usePagedResource, useResource } from "@/lib/console-api";
import { orNone, shortDate, usd } from "@/lib/console-format";
import {
  ADMIN_PERMISSIONS as P,
  type OrderStat,
  type Platform,
  type PlatformOrder,
} from "@/lib/admin-types";

/**
 * Imported orders, every firm in one shape.
 *
 * The filter that earns its place is "unattributed": a confirmed sale we have
 * been paid commission on that no member has claimed. That is money sitting in
 * the platform's share which somebody may yet turn up asking for, and it is
 * also the fastest way to spot a coupon that is being used by people who never
 * signed up.
 */

const STATUS_TONE: Record<string, Tone> = {
  PENDING: "warning",
  CONFIRMED: "success",
  PAID: "success",
  REJECTED: "danger",
};

export function OrderBrowser() {
  const { can } = useAccess();
  const [platformId, setPlatformId] = useState("");
  const [status, setStatus] = useState("");
  const [attributed, setAttributed] = useState<"" | "true" | "false">("");

  const platforms = useResource<Platform[]>("/api/admin/catalog/platforms", {
    enabled: can(P.platformView),
  });
  // Paged rather than a single 200-row pull: the orders table grows with every
  // import, and a filter that matches everything should not fetch everything.
  const orders = usePagedResource<PlatformOrder>("/api/admin/catalog/orders", {
    pageSize: 50,
    query: {
      platformId: platformId || undefined,
      status: status || undefined,
      attributed: attributed || undefined,
    },
  });
  const stats = useResource<OrderStat[]>("/api/admin/catalog/orders/stats", {
    enabled: can(P.analyticsView),
  });

  const rows = orders.rows;
  const sales = (stats.data ?? []).filter((row) => row.kind === "SALE");
  const totalOrders = sales.reduce((sum, row) => sum + row.orders, 0);
  const totalCommission = sales.reduce((sum, row) => sum + Number(row.commissionUsd || 0), 0);
  const confirmed = sales
    .filter((row) => row.status === "CONFIRMED" || row.status === "PAID")
    .reduce((sum, row) => sum + Number(row.commissionUsd || 0), 0);

  return (
    <div>
      <PageHeader
        eyebrow="OPERATIONS"
        title="Orders"
        description="Every imported sale, refund and adjustment across all firms — the table the matcher joins claims against."
      />

      {can(P.analyticsView) && sales.length > 0 && (
        <div className="mb-2 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <StatTile label="SALES ON FILE" value={totalOrders.toLocaleString("en-US")} />
          <StatTile label="COMMISSION TOTAL" value={usd(totalCommission)} />
          <StatTile label="CONFIRMED" value={usd(confirmed)} tone="success" />
          <StatTile
            label="NOT YET CONFIRMED"
            value={usd(totalCommission - confirmed)}
            tone="warning"
            hint="Cashback cannot clear against these."
          />
        </div>
      )}

      <Panel className="mb-4 p-[var(--ct-pad)]">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { value: "", label: "Any status" },
            { value: "CONFIRMED", label: "Confirmed" },
            { value: "PENDING", label: "Pending" },
            { value: "PAID", label: "Paid" },
            { value: "REJECTED", label: "Rejected" },
          ].map((option) => (
            <FilterChip
              key={option.label}
              active={status === option.value}
              onClick={() => setStatus(option.value)}
            >
              {option.label}
            </FilterChip>
          ))}

          <span className="mx-1 h-6 w-px bg-hair" />

          {[
            { value: "" as const, label: "All" },
            { value: "true" as const, label: "Claimed" },
            { value: "false" as const, label: "Unclaimed" },
          ].map((option) => (
            <FilterChip
              key={option.label}
              active={attributed === option.value}
              onClick={() => setAttributed(option.value)}
            >
              {option.label}
            </FilterChip>
          ))}

          {platforms.data && platforms.data.length > 0 && (
            <Select
              aria-label="Filter by firm"
              value={platformId}
              onChange={(event) => setPlatformId(event.target.value)}
              className="ml-auto w-auto min-w-[180px] py-2.5 text-[12.5px]"
            >
              <option value="">All firms</option>
              {platforms.data.map((platform) => (
                <option key={platform.id} value={platform.id}>
                  {platform.name}
                </option>
              ))}
            </Select>
          )}
        </div>
        {attributed === "false" && (
          <p className="mt-3 text-[11.5px] leading-5 text-muted">
            Sales nobody has claimed. Their commission stays with the platform until a member
            submits a matching receipt — which they still can, months later.
          </p>
        )}
      </Panel>

      {orders.error && (
        <div className="mb-2">
          <ErrorNote>{orders.error}</ErrorNote>
        </div>
      )}

      <Panel className="p-2">
        {orders.loading && rows.length === 0 ? (
          <LoadingRows rows={6} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No orders"
            message="Nothing matches this filter. Orders arrive by importing a firm's report."
          />
        ) : (
          <TableShell
            columns={["ORDER", "FIRM", "PRODUCT", "GROSS", "COMMISSION", "WHEN", "STATUS", "CLAIM"]}
            minWidth={1040}
          >
            {rows.map((order) => (
              <Tr key={order.id}>
                <Td className="font-mono text-[11.5px]">{order.externalId}</Td>
                <Td className="text-muted">{order.platform.name}</Td>
                <Td>
                  <span className="block max-w-[200px] truncate text-[12px]">
                    {order.product?.name ?? (
                      <span className="text-warning">{orNone(order.rawProductKey)}</span>
                    )}
                  </span>
                  {!order.product && order.rawProductKey && (
                    <span className="mt-1 block text-[10px] text-warning">unmapped</span>
                  )}
                </Td>
                <Td data-count className="font-mono">
                  {order.grossAmount ? usd(order.grossAmount, order.currency) : "—"}
                </Td>
                <Td data-count className="font-mono">
                  {usd(order.commissionAmountUsd)}
                </Td>
                <Td className="whitespace-nowrap text-muted">{shortDate(order.occurredAt)}</Td>
                <Td>
                  <Badge tone={STATUS_TONE[order.status] ?? "neutral"}>{order.status}</Badge>
                  {order.rawStatus && (
                    <span className="mt-1 block max-w-[130px] truncate font-mono text-[9px] text-muted">
                      {order.rawStatus}
                    </span>
                  )}
                </Td>
                <Td>
                  {order.conversion ? (
                    <Badge tone="info">{order.conversion.source}</Badge>
                  ) : (
                    <span className="text-[11px] text-muted">Unclaimed</span>
                  )}
                </Td>
              </Tr>
            ))}
          </TableShell>
        )}

        {rows.length > 0 && (
          <InfiniteScrollSentinel
            hasMore={orders.hasMore}
            loading={orders.loadingMore}
            onLoadMore={orders.loadMore}
            label="orders"
          />
        )}
      </Panel>

      {can(P.analyticsView) && sales.length > 0 && (
        <Panel className="mt-4 p-[var(--ct-pad)]">
          <PanelHeader
            eyebrow="ANALYTICS"
            title="By firm and status"
            description="Grouped straight from the orders table, so it reconciles against the reports you imported."
          />
          <div className="mt-3">
            <TableShell columns={["FIRM", "KIND", "STATUS", "ORDERS", "COMMISSION"]} minWidth={640}>
              {(stats.data ?? []).map((row, index) => (
                <Tr key={`${row.platform}-${row.kind}-${row.status}-${index}`}>
                  <Td>{row.platform}</Td>
                  <Td className="font-mono text-[10.5px] text-muted">{row.kind}</Td>
                  <Td>
                    <Badge tone={STATUS_TONE[row.status] ?? "neutral"}>{row.status}</Badge>
                  </Td>
                  <Td data-count className="font-mono">
                    {row.orders.toLocaleString("en-US")}
                  </Td>
                  <Td data-count className="font-mono">
                    {usd(row.commissionUsd)}
                  </Td>
                </Tr>
              ))}
            </TableShell>
          </div>
        </Panel>
      )}
    </div>
  );
}
