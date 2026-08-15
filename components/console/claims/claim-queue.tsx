"use client";

import { useState } from "react";
import { FilterChip } from "@/components/ui/filter-chip";
import { useToast } from "@/components/shell/toast";
import { ConfirmDialog } from "@/components/console/confirm-dialog";
import {
  Badge,
  EmptyState,
  ErrorNote,
  LoadingRows,
  PageHeader,
  Panel,
  RecordButton,
  RecordList,
  Select,
} from "@/components/console/ui";
import { useAccess } from "@/components/console/use-permissions";
import { useMutation, useResource } from "@/lib/console-api";
import { relativeTime, usd } from "@/lib/console-format";
import {
  ADMIN_PERMISSIONS as P,
  CLAIM_QUERY_STATUSES,
  type ClaimSummary,
  type Platform,
} from "@/lib/admin-types";
import { ClaimReview } from "./claim-review";
import { CLAIM_TONE } from "./claim-tone";

/**
 * The review queue.
 *
 * Opens on `MATCHED` rather than everything, because that is the only status
 * where a person is the bottleneck: awaiting-report claims resolve themselves
 * on the next import, and settled ones need nobody.
 */

type StatusFilter = (typeof CLAIM_QUERY_STATUSES)[number];

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "MATCHED", label: "To review" },
  { value: "AWAITING_REPORT", label: "Awaiting report" },
  { value: "DISPUTED", label: "Disputed" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "DUPLICATE", label: "Duplicate" },
];

export function ClaimQueue({ initialStatus }: { initialStatus?: string }) {
  const { can } = useAccess();
  const { toast } = useToast();
  const [status, setStatus] = useState<StatusFilter>(
    (CLAIM_QUERY_STATUSES as readonly string[]).includes(initialStatus ?? "")
      ? (initialStatus as StatusFilter)
      : "MATCHED",
  );
  const [platformId, setPlatformId] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rematching, setRematching] = useState(false);

  const claims = useResource<ClaimSummary[]>("/api/admin/claims", {
    query: { status, platformId: platformId || undefined, take: 100 },
  });
  const platforms = useResource<Platform[]>("/api/admin/catalog/platforms", {
    enabled: can(P.platformView),
  });
  const rematch = useMutation();

  const rows = claims.data ?? [];
  const selected = selectedId && rows.some((row) => row.id === selectedId) ? selectedId : null;

  const runRematch = async () => {
    const result = await rematch.mutate<{ matched?: number }>(
      `/api/admin/claims/rematch/${platformId}`,
    );
    if (!result) return;
    setRematching(false);
    toast(
      result.matched
        ? `${result.matched} claim${result.matched === 1 ? "" : "s"} matched to an order.`
        : "No waiting claim matched an order on file.",
      result.matched ? "success" : "info",
    );
    await claims.reload();
  };

  const platformName =
    platforms.data?.find((platform) => platform.id === platformId)?.name ?? "this firm";

  return (
    // `flex-1` claims the shell's spare height so the queue panel below can
    // fill it; an empty queue then centres its message instead of leaving a
    // band of dead page under a short card.
    <div className="flex flex-1 flex-col">
      <PageHeader
        eyebrow="OPERATIONS"
        title="Claims"
        description="Approving credits a wallet, so it is refused unless an order backs the claim - and never on your own claim."
        actions={
          can(P.claimApprove) && platformId ? (
            <button
              type="button"
              onClick={() => setRematching(true)}
              className="cursor-pointer rounded-[10px] border border-hair px-4 py-2.5 font-mono text-[9.5px] tracking-[0.13em] text-muted transition hover:border-primary hover:text-fg"
            >
              RE-CHECK WAITING CLAIMS
            </button>
          ) : null
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((filter) => (
          <FilterChip
            key={filter.value}
            active={status === filter.value}
            onClick={() => {
              setStatus(filter.value);
              setSelectedId(null);
            }}
          >
            {filter.label}
          </FilterChip>
        ))}

        {platforms.data && platforms.data.length > 0 && (
          <Select
            aria-label="Filter by firm"
            value={platformId}
            onChange={(event) => {
              setPlatformId(event.target.value);
              setSelectedId(null);
            }}
            className="ml-auto w-auto min-w-[190px] py-2.5 text-[12.5px]"
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

      {claims.error && (
        <div className="mb-2">
          <ErrorNote>{claims.error}</ErrorNote>
        </div>
      )}

      <div className="grid gap-2 xl:grid-cols-[310px_minmax(0,1fr)] xl:items-start">
        <RecordList className="max-h-[70vh] xl:sticky xl:top-0 xl:max-h-[calc(100dvh-var(--topbar-h)-2*var(--console-pad))]">
          {claims.loading && rows.length === 0 ? (
            <LoadingRows rows={5} />
          ) : rows.length === 0 ? (
            <EmptyState
              title="Nothing waiting"
              message={
                status === "MATCHED"
                  ? "Every matched claim has been reviewed. New ones appear here as imports land."
                  : "No claims with this status."
              }
            />
          ) : (
            rows.map((claim) => (
              <RecordButton
                key={claim.id}
                active={selected === claim.id}
                onClick={() => setSelectedId(claim.id)}
              >
                <span className="flex items-center justify-between gap-2">
                  <Badge tone={CLAIM_TONE[claim.status]}>
                    {claim.status.replaceAll("_", " ")}
                  </Badge>
                  <span data-count className="font-mono text-[12px]">
                    {claim.matchedOrder
                      ? usd(claim.matchedOrder.commissionAmountUsd)
                      : claim.claimedAmount
                        ? usd(claim.claimedAmount)
                        : "-"}
                  </span>
                </span>
                <strong className="mt-2 block truncate font-mono text-[12px]">
                  {claim.claimedExternalId}
                </strong>
                <span className="mt-1 block truncate text-[11px] text-muted">
                  {claim.user.displayName ?? claim.user.email}
                </span>
                <span className="mt-1 block truncate font-mono text-[9px] tracking-[0.1em] text-muted">
                  {claim.platform.name.toUpperCase()} · {relativeTime(claim.createdAt)}
                </span>
              </RecordButton>
            ))
          )}
        </RecordList>

        {selected ? (
          <ClaimReview
            key={selected}
            claimId={selected}
            onDecided={() => {
              void claims.reload();
              toast("Decision recorded.", "success");
            }}
          />
        ) : (
          <Panel className="flex flex-1 flex-col">
            <EmptyState
              title="Pick a claim"
              message="Choose one from the queue to see the receipt beside what the firm reported."
            />
          </Panel>
        )}
      </div>

      <ConfirmDialog
        open={rematching}
        onOpenChange={setRematching}
        title="Re-check waiting claims?"
        confirmLabel="Run the matcher"
        pending={rematch.pending}
        error={rematch.error}
        onConfirm={runRematch}
        summary={
          <>
            Every claim still waiting on {platformName} is compared again against the orders
            already imported. Matches move to the review queue - nothing is approved and no money
            moves.
          </>
        }
      />
    </div>
  );
}
