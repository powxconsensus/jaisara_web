"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldLabel, TextInput } from "@/components/ui/field";
import { ConfirmDialog } from "@/components/console/confirm-dialog";
import {
  Badge,
  DefinitionList,
  ErrorNote,
  Panel,
  PanelHeader,
  type Tone,
} from "@/components/console/ui";
import { useAccess } from "@/components/console/use-permissions";
import { useMutation, useResource } from "@/lib/console-api";
import { dateTime, orNone, pointsToUsd, shortDate, usd } from "@/lib/console-format";
import { ADMIN_PERMISSIONS as P, type ClaimDetail, type ClaimStatus } from "@/lib/admin-types";
import { CLAIM_TONE } from "./claim-tone";

/**
 * One claim, with the evidence a decision rests on.
 *
 * The centre of this screen is the comparison: what the member typed on the
 * left, what the firm's own report says on the right, and a mark against any
 * field where the two disagree. That is the actual review - approving is just
 * the button you press once the two columns line up.
 */
export function ClaimReview({
  claimId,
  onDecided,
}: {
  claimId: string;
  onDecided: () => void;
}) {
  const { can } = useAccess();
  const claim = useResource<ClaimDetail>(`/api/admin/claims/${claimId}`);
  // Only used to learn *whether* a receipt exists; the bytes come from the
  // authenticated route below, which re-checks permission on every read and
  // works identically on local disk and S3.
  const proof = useResource<{ url: string | null; expiresInSeconds?: number }>(
    `/api/admin/claims/${claimId}/proof`,
  );
  const { mutate, pending, error, setError } = useMutation();
  const [dialog, setDialog] = useState<"approve" | "reject" | null>(null);
  // Defaults to today rather than the claimed purchase date: the hold runs
  // from when the money was actually spent, and the admin is looking at the
  // affiliate dashboard, which is the authority on that.
  const [manual, setManual] = useState({
    externalId: "",
    commissionAmount: "",
    grossAmount: "",
    occurredAt: new Date().toISOString().slice(0, 10),
  });

  if (claim.loading && !claim.data) {
    return (
      <Panel className="p-8">
        <div aria-busy className="h-[420px] animate-pulse rounded-[13px] bg-surface-2" />
      </Panel>
    );
  }

  if (claim.error || !claim.data) {
    return (
      <Panel className="p-6">
        <ErrorNote>{claim.error ?? "That claim could not be loaded."}</ErrorNote>
      </Panel>
    );
  }

  const record = claim.data;
  const order = record.matchedOrder;
  const decided = record.status === "APPROVED" || record.status === "REJECTED";

  // A claim is only decidable once an order backs it. Approving an unmatched
  // claim would credit cashback against commission the firm never paid us.
  const canApprove = can(P.claimApprove) && !decided && Boolean(order);
  const canReject = can(P.claimReject) && !decided;
  // Recording the order is only offered when there is none - it writes a real
  // order carrying real commission, so it must never become a second way to
  // approve one that already matched.
  const canRecord =
    can(P.claimApprove) && can(P.orderRecordManual) && !decided && !order;

  const decide = async (action: "approve" | "reject", note: string) => {
    const body = action === "approve" ? { note: note || undefined } : { reason: note };
    const result = await mutate(`/api/admin/claims/${claimId}/${action}`, { body });
    if (!result) return;
    setDialog(null);
    await claim.reload();
    onDecided();
  };

  const recordOrder = async () => {
    const result = await mutate(`/api/admin/claims/${claimId}/record-order`, {
      body: {
        externalId: manual.externalId.trim() || record.claimedExternalId,
        commissionAmount: manual.commissionAmount.trim(),
        grossAmount: manual.grossAmount.trim() || undefined,
        occurredAt: new Date(manual.occurredAt).toISOString(),
      },
    });
    if (!result) return;
    await claim.reload();
    onDecided();
  };

  const claimedAmount = record.claimedAmount ?? null;
  const reportedGross = order?.grossAmount ?? null;

  return (
    <div className="space-y-2">
      <Panel className="p-[var(--ct-pad)]">
        <PanelHeader
          eyebrow={`CLAIM · ${record.platform.name.toUpperCase()}`}
          title={orNone(record.claimedExternalId)}
          description={`Submitted ${dateTime(record.createdAt)} by ${record.user.displayName ?? record.user.email}.`}
          actions={<Badge tone={CLAIM_TONE[record.status]}>{label(record.status)}</Badge>}
        />

        {record.status === "REJECTED" && record.rejectionReason && (
          <p className="mt-5 rounded-[11px] border border-hair p-4 text-[12.5px] leading-6 text-muted">
            <span className="font-mono text-[9px] tracking-[0.14em] text-danger">
              REJECTED -{" "}
            </span>
            {record.rejectionReason}
          </p>
        )}

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div>
            <p className="mb-3 font-mono text-[9px] tracking-[0.18em] text-muted">
              WHAT THE MEMBER CLAIMED
            </p>
            <DefinitionList
              rows={[
                { label: "Order number", value: orNone(record.claimedExternalId), mono: true },
                { label: "Amount paid", value: claimedAmount ? usd(claimedAmount) : "-" },
                { label: "Purchase date", value: shortDate(record.claimedPurchaseAt) },
                { label: "Product", value: orNone(record.claimedProductText) },
                { label: "Source", value: record.source },
              ]}
            />
          </div>

          <div>
            <p className="mb-3 font-mono text-[9px] tracking-[0.18em] text-muted">
              WHAT {record.platform.name.toUpperCase()} REPORTED
            </p>
            {order ? (
              <DefinitionList
                rows={[
                  {
                    label: "Order number",
                    value: (
                      <Match
                        ours={record.claimedExternalId}
                        theirs={order.externalId}
                        mono
                      />
                    ),
                  },
                  {
                    label: "Gross",
                    value: (
                      <Match
                        ours={claimedAmount ? usd(claimedAmount) : null}
                        theirs={usd(reportedGross)}
                      />
                    ),
                  },
                  { label: "Commission to us", value: usd(order.commissionAmountUsd) },
                  { label: "Reported on", value: shortDate(order.occurredAt) },
                  {
                    label: "Firm status",
                    value: `${order.status}${order.rawStatus ? ` · ${order.rawStatus}` : ""}`,
                  },
                ]}
              />
            ) : (
              <div className="rounded-[13px] border border-dashed border-hair p-5">
                <p className="text-[12.5px] leading-6 text-muted">
                  No order on file yet. This claim stays in the queue and is re-checked
                  automatically after every import of this firm&rsquo;s report - approving it
                  now would credit cashback against commission we have not been paid.
                </p>
              </div>
            )}
          </div>
        </div>

        {(record.matchStrategy || record.matchConfidence !== null) && (
          <p className="mt-5 font-mono text-[10px] tracking-[0.1em] text-muted">
            MATCHED BY {record.matchStrategy?.toUpperCase() ?? "-"}
            {record.matchConfidence !== null && record.matchConfidence !== undefined
              ? ` · CONFIDENCE ${(record.matchConfidence * 100).toFixed(0)}%`
              : ""}
          </p>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr] lg:items-start">
        <Panel className="p-[var(--ct-pad)]">
          <p className="mb-4 font-mono text-[9px] tracking-[0.18em] text-muted">
            UPLOADED RECEIPT
          </p>
          <ReceiptViewer
            url={
              proof.data?.url || record.proofStorageKey
                ? `/api/admin/claims/${claimId}/proof/file`
                : null
            }
            isPdf={/\.pdf$/i.test(record.proofStorageKey ?? "")}
            loading={proof.loading}
          />
        </Panel>

        <Panel className="p-[var(--ct-pad)]">
          <p className="mb-4 font-mono text-[9px] tracking-[0.18em] text-muted">MEMBER</p>
          <DefinitionList
            rows={[
              { label: "Email", value: record.user.email, mono: true },
              { label: "Name", value: orNone(record.user.displayName) },
              { label: "Joined", value: shortDate(record.user.createdAt) },
              { label: "Club tier", value: orNone(record.user.clubTierKey) },
            ]}
          />

          {record.conversion && (
            <>
              <p className="mb-3 mt-6 font-mono text-[9px] tracking-[0.18em] text-muted">
                WHAT WAS CREDITED
              </p>
              <DefinitionList
                rows={[
                  {
                    label: `Buyer · ${record.conversion.buyerPct}%`,
                    value: pointsToUsd(
                      splitPoints(record.conversion.commissionPoints, record.conversion.buyerPct),
                    ),
                  },
                  {
                    label: `Referrer · ${record.conversion.referrerPct}%`,
                    value: pointsToUsd(
                      splitPoints(record.conversion.commissionPoints, record.conversion.referrerPct),
                    ),
                  },
                  { label: "Commission", value: usd(record.conversion.commissionAmountUsd) },
                  { label: "Status", value: record.conversion.status },
                  { label: "Hold until", value: shortDate(record.conversion.holdUntil) },
                ]}
              />
            </>
          )}
        </Panel>
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      {!decided && (
        <Panel className="flex flex-wrap items-center gap-2.5 p-[var(--ct-pad)]">
          {canApprove ? (
            <Button size="lg" onClick={() => setDialog("approve")}>
              Approve &amp; credit
            </Button>
          ) : canRecord ? (
            <span className="font-mono text-[10px] tracking-[0.12em] text-muted">
              NO REPORT FOR THIS ORDER YET — RECORD IT BELOW
            </span>
          ) : (
            <span className="font-mono text-[10px] tracking-[0.12em] text-muted">
              {can(P.claimApprove)
                ? "APPROVAL LOCKED UNTIL AN ORDER MATCHES"
                : "YOU CANNOT APPROVE CLAIMS"}
            </span>
          )}
          {canReject && (
            <Button
              size="lg"
              variant="outline"
              className="border-danger text-danger hover:border-danger"
              onClick={() => setDialog("reject")}
            >
              Reject
            </Button>
          )}
        </Panel>
      )}

      {/* The path for a firm that sends no report.
          `approve` refuses a claim with no matched order - correctly, since a
          conversion cannot exist without one - so before this existed a claim
          against a manual firm was unapprovable and the member could never be
          paid. This supplies the report the firm never sent; the order is
          written first and the ordinary approval runs on top of it. */}
      {canRecord && (
        <Panel className="p-[var(--ct-pad)]">
          <PanelHeader
            eyebrow="NO CSV FOR THIS FIRM"
            title="Record the order"
            description="Copy the figures from the firm's affiliate dashboard. This writes a real order and approves the claim against it — the split, the hold and the wallet credit all run as usual."
          />

          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void recordOrder();
            }}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <FieldLabel htmlFor="mo-ref">ORDER REFERENCE</FieldLabel>
                <TextInput
                  id="mo-ref"
                  required
                  value={manual.externalId}
                  placeholder={record.claimedExternalId}
                  onChange={(event) => setManual({ ...manual, externalId: event.target.value })}
                />
                <p className="mt-2 text-[11px] text-muted">
                  The member claimed{" "}
                  <span className="font-mono text-fg">{record.claimedExternalId}</span>. A
                  different value is allowed and is recorded on the claim.
                </p>
              </div>
              <div>
                <FieldLabel htmlFor="mo-date">PURCHASED ON</FieldLabel>
                <TextInput
                  id="mo-date"
                  required
                  type="date"
                  value={manual.occurredAt}
                  onChange={(event) => setManual({ ...manual, occurredAt: event.target.value })}
                />
                <p className="mt-2 text-[11px] text-muted">The hold is counted from this date.</p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <FieldLabel htmlFor="mo-gross">ORDER AMOUNT (OPTIONAL)</FieldLabel>
                <TextInput
                  id="mo-gross"
                  inputMode="decimal"
                  placeholder="25.00"
                  value={manual.grossAmount}
                  onChange={(event) => setManual({ ...manual, grossAmount: event.target.value })}
                />
                <p className="mt-2 text-[11px] text-muted">
                  What the member paid. Recorded for reference; it is not what gets split.
                </p>
              </div>
              <div>
                <FieldLabel htmlFor="mo-commission">COMMISSION WE EARNED</FieldLabel>
                <TextInput
                  id="mo-commission"
                  required
                  inputMode="decimal"
                  placeholder="5.00"
                  value={manual.commissionAmount}
                  onChange={(event) =>
                    setManual({ ...manual, commissionAmount: event.target.value })
                  }
                />
                {/* Said out loud because it is the number that pays people. */}
                <p className="mt-2 text-[11px] leading-5 text-muted">
                  <span className="text-warning">This is the figure that gets split.</span> Type
                  what the affiliate dashboard actually says — it is never computed from a rate.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <Button size="lg" type="submit" disabled={pending}>
                {pending ? "Recording…" : "Record order & approve"}
              </Button>
              <span className="font-mono text-[10px] tracking-[0.12em] text-muted">
                CREDITS THE MEMBER AND THEIR REFERRER
              </span>
            </div>
          </form>
        </Panel>
      )}

      <ConfirmDialog
        open={dialog === "approve"}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
          setError(null);
        }}
        title="Approve this claim?"
        confirmLabel="Approve & credit"
        pending={pending}
        error={error}
        onConfirm={(note) => decide("approve", note)}
        summary={
          <>
            This credits the buyer, the referrer if there is one, and the platform from the{" "}
            <strong className="text-fg">{usd(order?.commissionAmountUsd)}</strong> commission on
            order <strong className="text-fg">{record.claimedExternalId}</strong>. The buyer&rsquo;s
            share lands as pending and clears when the hold period ends.
            <br />
            <br />
            Money moves when you confirm. Reversing it needs a manual adjustment.
          </>
        }
        reason={{
          label: "INTERNAL NOTE (OPTIONAL)",
          placeholder: "Anything the next reviewer should know",
          minLength: 0,
          help: "Kept internal - the member does not see this.",
        }}
      />

      <ConfirmDialog
        open={dialog === "reject"}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
          setError(null);
        }}
        title="Reject this claim?"
        intent="danger"
        confirmLabel="Reject claim"
        pending={pending}
        error={error}
        onConfirm={(reason) => decide("reject", reason)}
        summary={
          <>
            No money moves. Order number{" "}
            <strong className="text-fg">{record.claimedExternalId}</strong> is released, so another
            member can claim it - reject a genuine duplicate rather than a valid claim.
          </>
        }
        reason={{
          label: "REASON",
          placeholder: "e.g. The receipt shows a different order number to the one claimed",
          minLength: 3,
        }}
      />
    </div>
  );
}

/**
 * A reported value beside the claimed one, marked when they disagree.
 *
 * A mismatch is not automatically fraud - a member rounds an amount, or types
 * the invoice number instead of the order number - but it is the thing a
 * reviewer must not skim past, so it is called out rather than left to be
 * spotted by reading two columns.
 */
function Match({
  ours,
  theirs,
  mono,
}: {
  ours: string | null | undefined;
  theirs: string | null | undefined;
  mono?: boolean;
}) {
  const agrees =
    ours && theirs && ours.trim().replace(/^#/, "") === theirs.trim().replace(/^#/, "");

  return (
    <span className="inline-flex items-center gap-2">
      <span className={mono ? "font-mono text-[11.5px]" : undefined}>{orNone(theirs)}</span>
      {ours ? (
        agrees ? (
          <span aria-label="matches what the member claimed" className="text-success">
            ✓
          </span>
        ) : (
          <Badge tone="warning">DIFFERS</Badge>
        )
      ) : null}
    </span>
  );
}

function ReceiptViewer({
  url,
  isPdf,
  loading,
}: {
  url: string | null;
  isPdf: boolean;
  loading: boolean;
}) {
  if (loading) {
    return <div aria-busy className="h-[340px] animate-pulse rounded-[13px] bg-surface-2" />;
  }

  if (!url) {
    return (
      <div
        className="grid h-[340px] place-items-center rounded-[13px] border border-hair"
        style={{
          background:
            "repeating-linear-gradient(135deg, var(--surface-2) 0 12px, var(--surface) 12px 24px)",
        }}
      >
        <span className="rounded-lg bg-bg px-3.5 py-2 font-mono text-[10px] tracking-[0.12em] text-muted">
          NO RECEIPT ATTACHED
        </span>
      </div>
    );
  }

  return (
    <div>
      {isPdf ? (
        <object
          data={url}
          type="application/pdf"
          className="h-[420px] w-full rounded-[13px] border border-hair"
        >
          <p className="p-4 text-[12.5px] text-muted">
            This receipt is a PDF your browser will not preview.
          </p>
        </object>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- signed, short-lived storage URL; no stable host to configure
        <img
          src={url}
          alt="The receipt the member uploaded"
          className="max-h-[520px] w-full rounded-[13px] border border-hair bg-surface-2 object-contain"
        />
      )}
      <div className="mt-3 flex items-center justify-between gap-3">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[9.5px] tracking-[0.13em] text-primary hover:underline"
        >
          OPEN FULL SIZE ↗
        </a>
        <span className="font-mono text-[9px] tracking-[0.12em] text-muted">
          PERMISSION CHECKED ON EVERY VIEW
        </span>
      </div>
    </div>
  );
}

/**
 * One party's slice, in points.
 *
 * Truncated, matching how the money was actually split: buyer and referrer are
 * truncated and the platform absorbs the remainder, so the parts always
 * re-sum to the whole.
 */
function splitPoints(commissionPoints: string, pct: string): string {
  const points = BigInt(commissionPoints || "0");
  const basisPoints = BigInt(Math.round(Number(pct) * 100));
  return ((points * basisPoints) / BigInt(10_000)).toString();
}

function label(status: ClaimStatus): string {
  return status.replaceAll("_", " ");
}

export type { Tone };
