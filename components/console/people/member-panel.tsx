"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/shell/toast";
import { ConfirmDialog } from "@/components/console/confirm-dialog";
import { FieldLabel, TextInput } from "@/components/ui/field";
import {
  Badge,
  DefinitionList,
  ErrorNote,
  Panel,
  PanelHeader,
  StatTile,
} from "@/components/console/ui";
import { useAccess } from "@/components/console/use-permissions";
import { useMutation, useResource } from "@/lib/console-api";
import { dateTime, humanRole, orNone, pointsToUsd, shortDate } from "@/lib/console-format";
import { primaryName, secondaryHandle } from "@/lib/identity";
import {
  ADMIN_PERMISSIONS as P,
  type AdminUserDetail,
  type RoleCatalogItem,
} from "@/lib/admin-types";

/**
 * One member, and the three things an operator does to an account: read it,
 * change what it can reach, and stop it.
 *
 * Every role change names the account in the confirmation. Granting `admin` is
 * the single most consequential click in this console, and it should not be
 * possible to make it by mis-clicking a row.
 */

type PendingAction =
  | { kind: "role"; role: string; granting: boolean }
  | { kind: "suspend" }
  | { kind: "restore" }
  | { kind: "anonymise" }
  | null;

export function MemberPanel({
  userId,
  roles,
  onChanged,
}: {
  userId: string;
  /**
   * Every role that exists, from the API rather than a constant.
   *
   * A hardcoded list could not show a role an owner had just created, so a
   * custom role was grantable by the API and invisible on the only screen that
   * grants one.
   */
  roles: RoleCatalogItem[];
  onChanged: () => void;
}) {
  const { can, userId: selfId } = useAccess();
  const { toast } = useToast();
  const member = useResource<AdminUserDetail>(`/api/admin/users/${userId}`);
  const { mutate, pending, error, setError } = useMutation();
  const [action, setAction] = useState<PendingAction>(null);

  if (member.loading && !member.data) {
    return (
      <Panel className="p-8">
        <div aria-busy className="h-[400px] animate-pulse rounded-[13px] bg-surface-2" />
      </Panel>
    );
  }

  if (member.error || !member.data) {
    return (
      <Panel className="p-6">
        <ErrorNote>{member.error ?? "That member could not be loaded."}</ErrorNote>
      </Panel>
    );
  }

  const record = member.data;
  const held = new Set(record.roles.map((role) => role.roleKey));
  const isOwner = held.has("owner");
  const isSelf = record.id === selfId;
  const canManageRoles = can(P.roleManage);
  /**
   * `owner` and `user` are never offered. The API refuses a grant at or above
   * the actor's own rank, so an owner button could only ever fail; `user` is
   * the base role every account already holds. Highest authority first.
   */
  const grantable = [...roles]
    .filter((entry) => entry.key !== "owner" && entry.key !== "user")
    .sort((a, b) => b.rank - a.rank);
  const canManageUser = can(P.userManage);

  const run = async (reason: string) => {
    if (!action) return;

    const result = await (async () => {
      if (action.kind === "role") {
        return mutate(
          `/api/admin/users/${userId}/roles${action.granting ? "" : "/revoke"}`,
          { body: { role: action.role } },
        );
      }
      if (action.kind === "suspend") {
        return mutate(`/api/admin/users/${userId}/suspend`, { body: { reason } });
      }
      if (action.kind === "restore") {
        return mutate(`/api/admin/users/${userId}/restore`);
      }
      return mutate(`/api/admin/users/${userId}/anonymise`);
    })();

    if (!result) return;

    toast(successMessage(action), action.kind === "role" ? "success" : "warning");
    setAction(null);
    await member.reload();
    onChanged();
  };

  return (
    <div className="space-y-2">
      <Panel className="p-[var(--ct-pad)]">
        <PanelHeader
          eyebrow="MEMBER"
          // Falls back to the handle before "Unnamed": an account with a
          // username has told us who it is, and support searching for `@alice`
          // should not land on a row headed "Unnamed member".
          title={primaryName(record) || "Unnamed member"}
          description={
            secondaryHandle(record) ? `${secondaryHandle(record)} · ${record.email}` : record.email
          }
          actions={
            <div className="flex flex-wrap gap-1.5">
              <Badge tone={record.status === "ACTIVE" ? "success" : "danger"}>
                {record.status.replaceAll("_", " ")}
              </Badge>
              {isOwner && <Badge tone="primary">OWNER</Badge>}
              {isSelf && <Badge tone="info">THIS IS YOU</Badge>}
            </div>
          }
        />

        {record.suspendedNote && (
          <p className="mt-5 rounded-[11px] border border-hair p-4 text-[12.5px] leading-6 text-muted">
            <span className="font-mono text-[9px] tracking-[0.14em] text-danger">SUSPENDED - </span>
            {record.suspendedNote}
            {record.suspendedAt && (
              <span className="text-muted"> ({dateTime(record.suspendedAt)})</span>
            )}
          </p>
        )}

        <div className="mt-6 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <StatTile label="AVAILABLE" value={pointsToUsd(record.wallet?.availablePoints)} />
          <StatTile label="PENDING" value={pointsToUsd(record.wallet?.pendingPoints)} />
          <StatTile label="CLAIMS" value={record._count.claims} />
          <StatTile label="REFERRALS" value={record._count.referrals} />
        </div>

        {can(P.ledgerAdjust) && (
          <AdjustBalance
            userId={record.id}
            onDone={() => {
              void member.reload();
              onChanged();
            }}
          />
        )}

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <DefinitionList
            rows={[
              { label: "Member id", value: record.id, mono: true },
              { label: "Joined", value: dateTime(record.createdAt) },
              { label: "Last sign-in", value: dateTime(record.lastLoginAt) },
              {
                label: "Email verified",
                value: record.emailVerifiedAt ? (
                  shortDate(record.emailVerifiedAt)
                ) : (
                  <span className="text-warning">Not verified</span>
                ),
              },
            ]}
          />
          <DefinitionList
            rows={[
              { label: "Username", value: orNone(record.username), mono: true },
              { label: "Referral code", value: orNone(record.referralCode), mono: true },
              {
                label: "Referred by",
                value: record.referredBy
                  ? (primaryName(record.referredBy) || record.referredBy.referralCode)
                  : "-",
              },
              { label: "Club tier", value: orNone(record.clubTierKey) },
              { label: "KYC", value: record.kycStatus },
            ]}
          />
        </div>
      </Panel>

      <Panel className="p-[var(--ct-pad)]">
        <PanelHeader
          eyebrow="ACCESS"
          title="Roles"
          description={
            canManageRoles
              ? "Grants take effect on this member's next request. The API refuses any grant at or above your own rank."
              : "Only an owner can change role assignments."
          }
          actions={
            <Badge tone={canManageRoles ? "success" : "neutral"}>
              {canManageRoles ? "OWNER EDIT MODE" : "READ ONLY"}
            </Badge>
          }
        />

        {/* Buttons rather than a select. Each one has to show whether the role
            is already held - a dropdown collapses five independent grants into
            one value and loses exactly that. What was missing was never the
            control, it was knowing what each role hands over, so every row now
            says so. */}
        <div className="mt-5 grid gap-1.5">
          {grantable.map((entry) => {
            const role = entry.key;
            const granting = !held.has(role);
            // An owner's roles are managed by another owner through the API,
            // never by toggling here - the button would imply a demotion path
            // this screen does not implement safely.
            const disabled = !canManageRoles || isOwner || pending;

            return (
              <button
                key={role}
                type="button"
                disabled={disabled}
                onClick={() => setAction({ kind: "role", role, granting })}
                className={`flex cursor-pointer flex-wrap items-baseline gap-x-3 gap-y-1 rounded-[10px] border px-3.5 py-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  granting
                    ? "border-hair hover:border-primary"
                    : "border-primary bg-[color-mix(in_oklab,var(--primary)_12%,transparent)]"
                }`}
              >
                <span
                  className={`flex-none font-mono text-[9.5px] uppercase tracking-[0.12em] ${
                    granting ? "text-muted" : "text-primary"
                  }`}
                >
                  {granting ? "+ " : "✓ "}
                  {humanRole(role)}
                </span>
                <span className="min-w-0 flex-1 text-[11.5px] leading-5 text-muted">
                  {entry.description || `${entry.permissions.length} permissions`}
                </span>
                <span className="flex-none font-mono text-[9px] tracking-[0.1em] text-muted">
                  RANK {entry.rank}
                </span>
              </button>
            );
          })}
        </div>

        {isOwner && (
          <p className="mt-4 text-[11.5px] leading-5 text-muted">
            Owner accounts are not editable from this screen.
          </p>
        )}

        {record.roles.length > 0 && (
          <p className="mt-5 font-mono text-[9.5px] tracking-[0.1em] text-muted">
            GRANTED:{" "}
            {record.roles
              .map((role) => `${humanRole(role.roleKey)} (${shortDate(role.grantedAt)})`)
              .join(" · ")}
          </p>
        )}
      </Panel>

      {canManageUser && !isSelf && (
        <Panel className="p-[var(--ct-pad)]">
          <PanelHeader
            eyebrow="ACCOUNT"
            title="Account actions"
            description="Suspending ends every live session immediately. Erasure anonymises the row rather than deleting it, because the ledger references it."
          />
          <div className="mt-5 flex flex-wrap gap-2.5">
            {record.status === "SUSPENDED" ? (
              <Button variant="outline" onClick={() => setAction({ kind: "restore" })}>
                Lift suspension
              </Button>
            ) : (
              <Button
                variant="outline"
                className="border-warning text-warning"
                onClick={() => setAction({ kind: "suspend" })}
                disabled={isOwner}
              >
                Suspend account
              </Button>
            )}
            <Button
              variant="outline"
              className="border-danger text-danger"
              onClick={() => setAction({ kind: "anonymise" })}
              disabled={isOwner || record.status === "ANONYMIZED"}
            >
              Anonymise (erasure request)
            </Button>
          </div>
        </Panel>
      )}

      {error && <ErrorNote>{error}</ErrorNote>}

      <ConfirmDialog
        open={action !== null}
        onOpenChange={(open) => {
          if (!open) setAction(null);
          setError(null);
        }}
        title={action ? dialogTitle(action) : ""}
        intent={
          action?.kind === "anonymise" ||
          action?.kind === "suspend" ||
          (action?.kind === "role" && !action.granting)
            ? "danger"
            : "primary"
        }
        confirmLabel={action ? confirmLabel(action) : ""}
        pending={pending}
        error={error}
        onConfirm={run}
        reason={
          action?.kind === "suspend"
            ? {
                label: "REASON",
                placeholder: "e.g. Repeated duplicate claims after a warning",
                minLength: 3,
              }
            : undefined
        }
        summary={action ? summary(action, record) : null}
      />
    </div>
  );
}

function dialogTitle(action: NonNullable<PendingAction>): string {
  if (action.kind === "role") {
    return `${action.granting ? "Grant" : "Revoke"} ${humanRole(action.role)}?`;
  }
  if (action.kind === "suspend") return "Suspend this account?";
  if (action.kind === "restore") return "Lift this suspension?";
  return "Anonymise this member?";
}

function confirmLabel(action: NonNullable<PendingAction>): string {
  if (action.kind === "role") return action.granting ? "Grant role" : "Revoke role";
  if (action.kind === "suspend") return "Suspend & sign out";
  if (action.kind === "restore") return "Restore access";
  return "Anonymise permanently";
}

function successMessage(action: NonNullable<PendingAction>): string {
  if (action.kind === "role") {
    return `${humanRole(action.role)} ${action.granting ? "granted" : "revoked"}.`;
  }
  if (action.kind === "suspend") return "Account suspended and every session ended.";
  if (action.kind === "restore") return "Suspension lifted.";
  return "Member anonymised. The ledger is intact.";
}

function summary(action: NonNullable<PendingAction>, member: AdminUserDetail) {
  const who = (
    <>
      <strong className="text-fg">{member.displayName ?? "this member"}</strong> (
      <span className="font-mono text-[11.5px] text-fg">{member.email}</span>)
    </>
  );

  if (action.kind === "role") {
    return action.granting ? (
      <>
        {who} will be able to sign in to this console with the {humanRole(action.role)} role.
        Check the address character by character - this is the one action that hands over access.
      </>
    ) : (
      <>Removes the {humanRole(action.role)} role from {who}. Their member account is untouched.</>
    );
  }

  if (action.kind === "suspend") {
    return (
      <>
        {who} is signed out of every device immediately and cannot sign in again until the
        suspension is lifted. Their balance and claims are untouched.
      </>
    );
  }

  if (action.kind === "restore") {
    return <>{who} can sign in again. Any scheduled deletion is cancelled.</>;
  }

  return (
    <>
      The email address and name on {who} are replaced with placeholders and every OAuth link and
      trusted device is removed. Their ledger entries stay, because deleting the row would leave
      every reconciliation from that day onward pointing at nothing.
      <br />
      <br />
      <strong className="text-danger">This cannot be undone.</strong>
    </>
  );
}

/**
 * A manual correction to a member's balance.
 *
 * This is the reason it exists: without it, the only way to fix a wrong balance
 * is a direct database write, which leaves no entry, no actor and no reason,
 * and desynchronises the cached balance from the ledger. That is precisely the
 * drift the nightly reconciliation alerts on - self-inflicted, at the worst
 * possible time, by somebody trying to help.
 *
 * Taken in dollars because every other figure in this console is in dollars.
 * Asking for points here, in the one field that moves money without a
 * conversion behind it, is how a $5 goodwill credit becomes a $500 one.
 */
function AdjustBalance({ userId, onDone }: { userId: string; onDone: () => void }) {
  const { toast } = useToast();
  const { mutate, pending, error, setError } = useMutation();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const trimmed = amount.trim();
  const parsed = Number(trimmed);
  const wellFormed = /^-?\d{1,7}(\.\d{1,2})?$/.test(trimmed) && parsed !== 0;
  const canSubmit = wellFormed && reason.trim().length >= 4;

  const submit = async () => {
    const saved = await mutate<{ amountUsd: string; availableUsd: string }>(
      `/api/admin/ledger/adjust/${userId}`,
      { body: { amountUsd: trimmed, reason: reason.trim() } },
    );
    if (!saved) return;

    toast(`Balance adjusted by $${saved.amountUsd}. Now $${saved.availableUsd} available.`, "success");
    setOpen(false);
    setAmount("");
    setReason("");
    onDone();
  };

  if (!open) {
    return (
      <div className="mt-4">
        <Button size="sm" variant="outline" onClick={() => { setError(null); setOpen(true); }}>
          Adjust balance
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-[14px] border border-hair bg-surface-2 p-[clamp(16px,2.5vw,20px)]">
      <PanelHeader
        eyebrow="LEDGER"
        title="Adjust balance"
        description="Posts a signed, audited ADJUSTMENT entry and moves the balance in the same transaction. Use a negative amount to take money back."
      />

      <div className="mt-4 grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
        <div>
          <FieldLabel htmlFor="adjust-amount">AMOUNT (USD)</FieldLabel>
          <TextInput
            id="adjust-amount"
            autoFocus
            inputMode="decimal"
            placeholder="12.50"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          {trimmed !== "" && !wellFormed && (
            <p className="mt-2 text-[11.5px] text-warning">
              An amount like 12.50, or -12.50 to debit. Zero records nothing.
            </p>
          )}
        </div>
        <div>
          <FieldLabel htmlFor="adjust-reason">REASON</FieldLabel>
          <TextInput
            id="adjust-reason"
            maxLength={300}
            placeholder="Goodwill for a payout delayed by the FundedNext import"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          {/* The memo is what the member's own wallet history will show, and
              what anybody auditing this later has to work from. */}
          <p className="mt-2 text-[11px] text-muted">
            Written onto the entry itself - it is the only record of why.
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" disabled={pending || !canSubmit} onClick={() => void submit()}>
          {pending ? "Posting…" : "Post adjustment"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
