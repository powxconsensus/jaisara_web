"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/shell/toast";
import { ConfirmDialog } from "@/components/console/confirm-dialog";
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
import {
  ADMIN_PERMISSIONS as P,
  ASSIGNABLE_ROLES,
  type AdminUserDetail,
  type AssignableRole,
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
  | { kind: "role"; role: AssignableRole; granting: boolean }
  | { kind: "suspend" }
  | { kind: "restore" }
  | { kind: "anonymise" }
  | null;

export function MemberPanel({
  userId,
  onChanged,
}: {
  userId: string;
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
    <div className="space-y-4">
      <Panel className="p-[clamp(18px,3vw,26px)]">
        <PanelHeader
          eyebrow="MEMBER"
          title={record.displayName ?? "Unnamed member"}
          description={record.email}
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
            <span className="font-mono text-[9px] tracking-[0.14em] text-danger">SUSPENDED — </span>
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
              { label: "Referral code", value: orNone(record.referralCode), mono: true },
              {
                label: "Referred by",
                value: record.referredBy
                  ? (record.referredBy.displayName ?? record.referredBy.referralCode)
                  : "—",
              },
              { label: "Club tier", value: orNone(record.clubTierKey) },
              { label: "KYC", value: record.kycStatus },
            ]}
          />
        </div>
      </Panel>

      <Panel className="p-[clamp(18px,3vw,26px)]">
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

        <div className="mt-5 flex flex-wrap gap-2">
          {ASSIGNABLE_ROLES.map((role) => {
            const granting = !held.has(role);
            // An owner's roles are managed by another owner through the API,
            // never by toggling here — the button would imply a demotion path
            // this screen does not implement safely.
            const disabled = !canManageRoles || isOwner || pending;

            return (
              <button
                key={role}
                type="button"
                disabled={disabled}
                onClick={() => setAction({ kind: "role", role, granting })}
                className={`cursor-pointer rounded-[10px] border px-3.5 py-2.5 font-mono text-[9.5px] uppercase tracking-[0.12em] transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  granting
                    ? "border-hair text-muted hover:border-primary hover:text-fg"
                    : "border-primary bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] text-primary"
                }`}
              >
                {granting ? "+ " : "✓ "}
                {humanRole(role)}
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
        <Panel className="p-[clamp(18px,3vw,26px)]">
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
        Check the address character by character — this is the one action that hands over access.
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
