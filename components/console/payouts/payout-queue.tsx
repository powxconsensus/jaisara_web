"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldLabel, TextInput } from "@/components/ui/field";
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
  StatTile,
  TableShell,
  Td,
  Tr,
  type Tone,
} from "@/components/console/ui";
import { useAccess } from "@/components/console/use-permissions";
import { useMutation, useResource } from "@/lib/console-api";
import { isOlderThan, pointsToUsd, relativeTime } from "@/lib/console-format";
import {
  ADMIN_PERMISSIONS as P,
  type Withdrawal,
  type WithdrawalStatus,
} from "@/lib/admin-types";

/**
 * The payout queue.
 *
 * Marking one paid is the highest-privilege action in the system and the last
 * irreversible step money takes, so the confirmation restates the amount and
 * the destination address in full. An address shown truncated in a table is
 * exactly how funds go to the wrong chain.
 */

const FILTERS: { value: WithdrawalStatus | ""; label: string }[] = [
  { value: "REQUESTED", label: "Requested" },
  { value: "APPROVED", label: "Approved" },
  { value: "PROCESSING", label: "Processing" },
  { value: "PAID", label: "Paid" },
  { value: "FAILED", label: "Failed" },
  { value: "", label: "All" },
];

const STATUS_TONE: Record<WithdrawalStatus, Tone> = {
  REQUESTED: "warning",
  APPROVED: "info",
  PROCESSING: "info",
  PAID: "success",
  FAILED: "danger",
  CANCELLED: "neutral",
};

/**
 * When a waiting payout stops being normal and starts being a problem.
 *
 * Two days. Members are told withdrawals are reviewed within a couple of
 * working days, so this is the point at which the queue is failing the promise
 * rather than simply having work in it.
 */
const STALE_MS = 2 * 24 * 60 * 60 * 1000;

type Action = { kind: "paid" | "refund"; row: Withdrawal } | null;

export function PayoutQueue() {
  const { can } = useAccess();
  const { toast } = useToast();
  const [status, setStatus] = useState<WithdrawalStatus | "">("REQUESTED");
  const [action, setAction] = useState<Action>(null);
  const [txId, setTxId] = useState("");
  const [cancelled, setCancelled] = useState(false);

  const payouts = useResource<Withdrawal[]>("/api/admin/payouts", {
    query: { status: status || undefined },
  });
  const { mutate, pending, error, setError } = useMutation();

  const rows = payouts.data ?? [];
  const canProcess = can(P.withdrawalProcess);
  /**
   * The oldest request nobody has acted on.
   *
   * `REQUESTED` only: a payout that has been marked paid is finished, and
   * including it would make the number stop moving after the first payout of
   * the day and look stuck.
   */
  const oldestWaiting = (payouts.data ?? [])
    .filter((row) => row.status === "REQUESTED")
    .map((row) => row.requestedAt)
    .sort()[0];

  // Summed as BigInt because points arrive as strings precisely so they never
  // pass through a float. (Constructor rather than a `0n` literal — the
  // project targets ES2017, where the literal syntax is not available.)
  const owed = rows
    .filter((row) => row.status === "REQUESTED" || row.status === "APPROVED")
    .reduce((total, row) => total + BigInt(row.points || "0"), BigInt(0));

  const run = async (reason: string) => {
    if (!action) return;

    const result =
      action.kind === "paid"
        ? await mutate(`/api/admin/payouts/${action.row.id}/paid`, {
            body: { externalTxId: txId.trim() || undefined },
          })
        : await mutate(`/api/admin/payouts/${action.row.id}/refund`, {
            body: { reason, cancelled },
          });

    if (!result) return;

    toast(
      action.kind === "paid"
        ? "Payout recorded as sent."
        : `Balance returned to the member${cancelled ? " and the request cancelled" : ""}.`,
      action.kind === "paid" ? "success" : "warning",
    );
    setAction(null);
    setTxId("");
    setCancelled(false);
    await payouts.reload();
  };

  return (
    <div>
      <PageHeader
        eyebrow="MONEY"
        title="Payouts"
        description="Oldest first. The balance left the member's wallet when they requested — marking paid records that the transfer went out."
        actions={!canProcess ? <Badge tone="neutral">READ ONLY</Badge> : undefined}
      />

      <div className="mb-2 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <StatTile
          label="AWAITING PAYOUT"
          value={rows.filter((row) => row.status === "REQUESTED").length}
          tone="warning"
        />
        <StatTile label="OWED IN QUEUE" value={pointsToUsd(owed.toString())} />
        <StatTile label="SHOWN" value={rows.length} hint="Capped at 100 per status." />
        {/* How long the person who has waited longest has been waiting.
            This slot used to restate the reader's own permissions — which the
            buttons already say by being present or absent, and which does not
            change from one visit to the next. A payout queue has exactly one
            urgent question, and this is it. */}
        <StatTile
          label="LONGEST WAIT"
          value={oldestWaiting ? relativeTime(oldestWaiting).replace(/^in /, "") : "—"}
          tone={isOlderThan(oldestWaiting, STALE_MS) ? "warning" : "neutral"}
          hint={oldestWaiting ? "Oldest request still unpaid." : "Nothing is waiting."}
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <FilterChip
            key={filter.label}
            active={status === filter.value}
            onClick={() => setStatus(filter.value)}
          >
            {filter.label}
          </FilterChip>
        ))}
      </div>

      {payouts.error && (
        <div className="mb-2">
          <ErrorNote>{payouts.error}</ErrorNote>
        </div>
      )}

      <Panel className="p-2">
        {payouts.loading && rows.length === 0 ? (
          <LoadingRows rows={5} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Nothing in the queue"
            message="No withdrawal requests with this status."
          />
        ) : (
          <TableShell
            columns={["MEMBER", "AMOUNT", "DESTINATION", "REQUESTED", "STATUS", ""]}
            minWidth={940}
          >
            {rows.map((row) => (
              <Tr key={row.id}>
                <Td>
                  <strong className="block text-[12.5px]">
                    {row.user.displayName ?? "Unnamed member"}
                  </strong>
                  <span className="mt-1 block font-mono text-[10.5px] text-muted">
                    {row.user.email}
                  </span>
                  {row.user.kycStatus !== "APPROVED" && (
                    <span className="mt-1.5 inline-block">
                      <Badge tone="warning">KYC {row.user.kycStatus}</Badge>
                    </span>
                  )}
                </Td>
                <Td>
                  <span data-count className="font-mono text-[13px]">
                    {pointsToUsd(row.points)}
                  </span>
                  {row.feePoints && row.feePoints !== "0" && (
                    <span className="mt-1 block text-[10.5px] text-muted">
                      fee {pointsToUsd(row.feePoints)}
                    </span>
                  )}
                </Td>
                <Td>
                  {row.rewardItem ? (
                    <>
                      <span className="block text-[12px]">{row.rewardItem.name}</span>
                      <span className="mt-1 block text-[10.5px] text-muted">
                        {row.rewardItem.brand ?? "Gift card"}
                      </span>
                    </>
                  ) : row.payoutAddress ? (
                    <>
                      <Badge tone="info">{row.payoutAddress.chain}</Badge>
                      <span className="mt-1.5 block max-w-[220px] truncate font-mono text-[10.5px] text-muted">
                        {row.payoutAddress.address}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </Td>
                <Td className="whitespace-nowrap text-muted">
                  {relativeTime(row.requestedAt)}
                </Td>
                <Td>
                  <Badge tone={STATUS_TONE[row.status]}>{row.status}</Badge>
                  {row.failureReason && (
                    <span className="mt-1.5 block max-w-[200px] text-[10.5px] text-danger">
                      {row.failureReason}
                    </span>
                  )}
                  {row.externalTxId && (
                    <span className="mt-1.5 block max-w-[200px] truncate font-mono text-[10px] text-muted">
                      {row.externalTxId}
                    </span>
                  )}
                </Td>
                <Td>
                  {canProcess &&
                    (row.status === "REQUESTED" ||
                      row.status === "APPROVED" ||
                      row.status === "PROCESSING") && (
                      <div className="flex flex-col gap-1.5">
                        <Button
                          size="sm"
                          onClick={() => {
                            setError(null);
                            setAction({ kind: "paid", row });
                          }}
                        >
                          Mark paid
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-danger text-danger"
                          onClick={() => {
                            setError(null);
                            setAction({ kind: "refund", row });
                          }}
                        >
                          Return
                        </Button>
                      </div>
                    )}
                </Td>
              </Tr>
            ))}
          </TableShell>
        )}
      </Panel>

      <ConfirmDialog
        open={action?.kind === "paid"}
        onOpenChange={(open) => {
          if (!open) setAction(null);
        }}
        title="Record this payout as sent?"
        confirmLabel="Mark as paid"
        pending={pending}
        error={error}
        onConfirm={run}
        summary={
          action ? (
            <>
              Confirm you have already sent{" "}
              <strong className="text-fg">{pointsToUsd(action.row.points)}</strong> to{" "}
              <strong className="text-fg">{action.row.user.email}</strong>
              {action.row.payoutAddress && (
                <>
                  {" "}
                  on <strong className="text-fg">{action.row.payoutAddress.chain}</strong> at:
                  <br />
                  <span className="mt-2 block break-all rounded-[9px] bg-surface-2 p-2.5 font-mono text-[11px] text-fg">
                    {action.row.payoutAddress.address}
                  </span>
                </>
              )}
              {action.row.rewardItem && (
                <>
                  {" "}
                  as <strong className="text-fg">{action.row.rewardItem.name}</strong>.
                </>
              )}
              <br />
              <br />
              Check the address against the transfer you actually made — this only records what
              happened, it does not send anything.
              <div className="mt-4">
                <FieldLabel htmlFor="payout-tx">TRANSACTION ID (OPTIONAL)</FieldLabel>
                <TextInput
                  id="payout-tx"
                  value={txId}
                  onChange={(event) => setTxId(event.target.value)}
                  placeholder="0x… or the exchange reference"
                />
              </div>
            </>
          ) : null
        }
      />

      <ConfirmDialog
        open={action?.kind === "refund"}
        onOpenChange={(open) => {
          if (!open) setAction(null);
        }}
        title="Return this balance?"
        intent="danger"
        confirmLabel="Return the balance"
        pending={pending}
        error={error}
        onConfirm={run}
        reason={{
          label: "REASON",
          placeholder: "e.g. The USDT address was rejected by the network",
          minLength: 3,
        }}
        summary={
          action ? (
            <>
              <strong className="text-fg">{pointsToUsd(action.row.points)}</strong> goes back to{" "}
              <strong className="text-fg">{action.row.user.email}</strong>&rsquo;s available
              balance. Do this only if the transfer did <em>not</em> go out — otherwise they keep
              both.
              <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-[10px] border border-hair p-3">
                <input
                  type="checkbox"
                  checked={cancelled}
                  onChange={(event) => setCancelled(event.target.checked)}
                  className="mt-0.5 size-4 cursor-pointer accent-[var(--primary)]"
                />
                <span className="text-[11.5px] leading-5">
                  Cancel the request as well, rather than marking it failed. Use this when the
                  member asked to withdraw it.
                </span>
              </label>
            </>
          ) : null
        }
      />
    </div>
  );
}
