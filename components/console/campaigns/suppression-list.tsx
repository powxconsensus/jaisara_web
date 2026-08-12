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
  Panel,
  PanelHeader,
  TableShell,
  Td,
  Tr,
  type Tone,
} from "@/components/console/ui";
import { useAccess } from "@/components/console/use-permissions";
import { useMutation, useResource } from "@/lib/console-api";
import { dateTime } from "@/lib/console-format";
import { ADMIN_PERMISSIONS as P, type Suppression } from "@/lib/admin-types";

/**
 * The do-not-mail list.
 *
 * Present in the API from the start with no way to read it, which is the worst
 * combination: addresses get suppressed by bounce and complaint webhooks and
 * nobody can see why a member stopped receiving mail. Lifting one is possible
 * but deliberately friction-heavy - a hard bounce that was suppressed for a
 * reason will simply bounce again and damage the sending domain.
 */

const REASON_TONE: Record<Suppression["reason"], Tone> = {
  HARD_BOUNCE: "danger",
  COMPLAINT: "danger",
  UNSUBSCRIBED: "neutral",
  MANUAL: "warning",
};

const REASONS: { value: "" | Suppression["reason"]; label: string }[] = [
  { value: "", label: "All" },
  { value: "HARD_BOUNCE", label: "Hard bounces" },
  { value: "COMPLAINT", label: "Complaints" },
  { value: "UNSUBSCRIBED", label: "Unsubscribed" },
  { value: "MANUAL", label: "Added by hand" },
];

export function SuppressionList() {
  const { can } = useAccess();
  const { toast } = useToast();
  const [reason, setReason] = useState<"" | Suppression["reason"]>("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [lifting, setLifting] = useState<Suppression | null>(null);

  const canManage = can(P.suppressionManage);
  const suppressions = useResource<Suppression[]>("/api/admin/marketing/suppressions", {
    query: { reason: reason || undefined, take: 200 },
  });
  const { mutate, pending, error, setError } = useMutation();

  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await mutate("/api/admin/marketing/suppressions", {
      body: { email: email.trim().toLowerCase(), reason: "MANUAL", note: note.trim() || undefined },
    });
    if (!result) return;
    toast(`${email.trim().toLowerCase()} will no longer receive marketing.`, "success");
    setEmail("");
    setNote("");
    await suppressions.reload();
  };

  const lift = async () => {
    if (!lifting) return;
    const result = await mutate(
      `/api/admin/marketing/suppressions/${encodeURIComponent(lifting.email)}`,
      { method: "DELETE" },
    );
    if (!result) return;
    toast(`Mail to ${lifting.email} resumed.`, "warning");
    setLifting(null);
    await suppressions.reload();
  };

  const rows = suppressions.data ?? [];

  return (
    <div className="space-y-2">
      {canManage && (
        <Panel className="p-[var(--ct-pad)]">
          <PanelHeader
            eyebrow="ADD"
            title="Suppress an address"
            description="Use this when someone asks to be removed through support rather than the unsubscribe link. It takes effect on the next send."
          />
          <form onSubmit={add} className="mt-5 flex flex-wrap items-end gap-3">
            <div className="min-w-[240px] flex-1">
              <FieldLabel htmlFor="suppress-email">EMAIL ADDRESS</FieldLabel>
              <TextInput
                id="suppress-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="member@example.com"
              />
            </div>
            <div className="min-w-[240px] flex-1">
              <FieldLabel htmlFor="suppress-note">NOTE (OPTIONAL)</FieldLabel>
              <TextInput
                id="suppress-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Asked to be removed by email on 4 Aug"
              />
            </div>
            <Button type="submit" size="lg" disabled={pending || !email.trim()}>
              Suppress
            </Button>
          </form>
          {error && (
            <div className="mt-4">
              <ErrorNote>{error}</ErrorNote>
            </div>
          )}
        </Panel>
      )}

      <Panel className="p-[var(--ct-pad)]">
        <PanelHeader
          eyebrow="DO NOT MAIL"
          title="Suppression list"
          description="Bounces and complaints land here automatically from the SES webhook. Every send filters against it."
        />

        <div className="mt-5 mb-4 flex flex-wrap gap-2">
          {REASONS.map((option) => (
            <FilterChip
              key={option.label}
              active={reason === option.value}
              onClick={() => setReason(option.value)}
            >
              {option.label}
            </FilterChip>
          ))}
        </div>

        {suppressions.loading && rows.length === 0 ? (
          <LoadingRows rows={4} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Nothing suppressed"
            message="No addresses match this filter - the healthiest possible state for a sending domain."
          />
        ) : (
          <TableShell columns={["ADDRESS", "REASON", "SOURCE", "ADDED", ""]} minWidth={780}>
            {rows.map((row) => (
              <Tr key={row.email}>
                <Td className="font-mono text-[11.5px]">{row.email}</Td>
                <Td>
                  <Badge tone={REASON_TONE[row.reason]}>{row.reason.replaceAll("_", " ")}</Badge>
                </Td>
                <Td className="text-muted">{row.source ?? "-"}</Td>
                <Td className="whitespace-nowrap text-muted">{dateTime(row.createdAt)}</Td>
                <Td>
                  {canManage && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setError(null);
                        setLifting(row);
                      }}
                    >
                      Lift
                    </Button>
                  )}
                </Td>
              </Tr>
            ))}
          </TableShell>
        )}
      </Panel>

      <ConfirmDialog
        open={lifting !== null}
        onOpenChange={(open) => {
          if (!open) setLifting(null);
        }}
        title="Resume mail to this address?"
        intent="danger"
        confirmLabel="Lift suppression"
        pending={pending}
        error={error}
        onConfirm={lift}
        summary={
          lifting ? (
            <>
              <strong className="text-fg">{lifting.email}</strong> was suppressed because of a{" "}
              <strong className="text-fg">{lifting.reason.replaceAll("_", " ").toLowerCase()}</strong>
              .
              {lifting.reason === "HARD_BOUNCE" && (
                <>
                  {" "}
                  A hard bounce means the address does not exist. Mailing it again will bounce
                  again, and repeated bounces damage the sending reputation for every member.
                </>
              )}
              {lifting.reason === "COMPLAINT" && (
                <>
                  {" "}
                  This person marked our mail as spam. Mailing them again is the fastest route to
                  a blocked sending domain.
                </>
              )}
              {(lifting.reason === "UNSUBSCRIBED" || lifting.reason === "MANUAL") && (
                <> Only lift this if they have asked to be resubscribed.</>
              )}
            </>
          ) : null
        }
      />
    </div>
  );
}
