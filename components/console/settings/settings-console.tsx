"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/field";
import { useToast } from "@/components/shell/toast";
import {
  Badge,
  EmptyState,
  ErrorNote,
  LoadingRows,
  PageHeader,
  Panel,
  PanelHeader,
  Segmented,
  TableShell,
  Td,
  Tr,
} from "@/components/console/ui";
import { useAccess } from "@/components/console/use-permissions";
import { useMutation, useResource } from "@/lib/console-api";
import { dateTime, humanRole, usd } from "@/lib/console-format";
import {
  ADMIN_PERMISSIONS as P,
  type AuditEntry,
  type ClubTier,
  type Setting,
} from "@/lib/admin-types";
import { SplitEditor } from "./split-editor";

/**
 * Money configuration and oversight.
 *
 * Grouped with the audit log on purpose: these are the settings whose change
 * is worth being able to answer "who did that, and when" about, and putting
 * the record next to the controls makes that answer one tab away.
 */

type Tab = "splits" | "tiers" | "settings" | "audit";

export function SettingsConsole() {
  const { can } = useAccess();
  const [tab, setTab] = useState<Tab>("splits");

  const options = [
    { value: "splits" as const, label: "Splits" },
    { value: "tiers" as const, label: "Club tiers" },
    { value: "settings" as const, label: "Settings" },
    ...(can(P.auditView) ? [{ value: "audit" as const, label: "Audit log" }] : []),
  ];

  return (
    <div>
      <PageHeader
        eyebrow="MONEY"
        title="Splits & config"
        description="What the platform keeps, how long cashback is held, and the record of who changed it."
        actions={
          <Segmented label="Configuration section" value={tab} onChange={setTab} options={options} />
        }
      />

      {tab === "splits" && <SplitEditor />}
      {tab === "tiers" && <TierTable />}
      {tab === "settings" && <SettingsTable />}
      {tab === "audit" && <AuditLog />}
    </div>
  );
}

function TierTable() {
  const tiers = useResource<ClubTier[]>("/api/admin/config/tiers");
  const rows = tiers.data ?? [];

  return (
    <Panel className="p-[clamp(18px,3vw,26px)]">
      <PanelHeader
        eyebrow="JAISARA CLUB"
        title="Tiers"
        description="A tier can carry its own split, which overrides the scope default for members who reach it."
      />
      <div className="mt-5">
        {tiers.loading && rows.length === 0 ? (
          <LoadingRows rows={3} />
        ) : rows.length === 0 ? (
          <EmptyState title="No tiers" message="The club has no tiers configured yet." />
        ) : (
          <TableShell
            columns={["TIER", "RANK", "QUALIFIES AT", "OWN SPLIT", "MEMBERS"]}
            minWidth={720}
          >
            {rows.map((tier) => (
              <Tr key={tier.key}>
                <Td>
                  <strong className="block text-[12.5px]">{tier.name}</strong>
                  <span className="mt-1 block font-mono text-[10px] text-muted">{tier.key}</span>
                </Td>
                <Td data-count className="font-mono">
                  {tier.rank}
                </Td>
                <Td className="text-muted">
                  {tier.minQualifiedReferrals} referrals · {usd(tier.minLifetimeVolumeUsd)} volume
                </Td>
                <Td>
                  {tier.buyerPct ? (
                    <span className="font-mono text-[11.5px]">
                      {tier.buyerPct}/{tier.referrerPct}/{tier.platformPct}
                    </span>
                  ) : (
                    <span className="text-[11.5px] text-muted">Uses the scope default</span>
                  )}
                </Td>
                <Td data-count className="font-mono">
                  {tier._count?.users ?? 0}
                </Td>
              </Tr>
            ))}
          </TableShell>
        )}
      </div>
    </Panel>
  );
}

function SettingsTable() {
  const { can } = useAccess();
  const { toast } = useToast();
  const settings = useResource<Setting[]>("/api/admin/config/settings");
  const { mutate, pending, error, setError } = useMutation();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const canManage = can(P.configManage);
  const rows = settings.data ?? [];

  const save = async (key: string) => {
    // Numbers and booleans are stored as such; only fall back to a string when
    // the input is neither, so a "30" does not become the string "30".
    const parsed =
      draft === "true" ? true : draft === "false" ? false : Number(draft) ? Number(draft) : draft;

    const saved = await mutate(`/api/admin/config/settings/${encodeURIComponent(key)}`, {
      method: "PATCH",
      body: { value: parsed },
    });
    if (!saved) return;
    toast(`${key} updated.`, "success");
    setEditing(null);
    await settings.reload();
  };

  return (
    <Panel className="p-[clamp(18px,3vw,26px)]">
      <PanelHeader
        eyebrow="KNOBS"
        title="Settings"
        description="Singleton values the API reads at runtime. Changes take effect immediately — the service cache is invalidated on write."
      />

      {error && (
        <div className="mt-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      <div className="mt-5">
        {settings.loading && rows.length === 0 ? (
          <LoadingRows rows={4} />
        ) : rows.length === 0 ? (
          <EmptyState title="No settings" message="Nothing configurable is registered yet." />
        ) : (
          <TableShell columns={["KEY", "VALUE", "UPDATED", ""]} minWidth={720}>
            {rows.map((setting) => (
              <Tr key={setting.key}>
                <Td>
                  <span className="font-mono text-[11.5px]">{setting.key}</span>
                  {setting.description && (
                    <span className="mt-1 block max-w-[380px] text-[11px] leading-5 text-muted">
                      {setting.description}
                    </span>
                  )}
                </Td>
                <Td>
                  {editing === setting.key ? (
                    <TextInput
                      autoFocus
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      className="max-w-[220px] py-2 font-mono text-[12px]"
                    />
                  ) : (
                    <span className="font-mono text-[11.5px]">{JSON.stringify(setting.value)}</span>
                  )}
                </Td>
                <Td className="whitespace-nowrap text-muted">{dateTime(setting.updatedAt)}</Td>
                <Td>
                  {canManage &&
                    (editing === setting.key ? (
                      <div className="flex gap-1.5">
                        <Button size="sm" disabled={pending} onClick={() => void save(setting.key)}>
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setError(null);
                          setEditing(setting.key);
                          setDraft(
                            typeof setting.value === "string"
                              ? setting.value
                              : JSON.stringify(setting.value),
                          );
                        }}
                      >
                        Edit
                      </Button>
                    ))}
                </Td>
              </Tr>
            ))}
          </TableShell>
        )}
      </div>
    </Panel>
  );
}

function AuditLog() {
  const [action, setAction] = useState("");
  const entries = useResource<AuditEntry[]>("/api/admin/config/audit", {
    query: { action: action || undefined, take: 100 },
  });
  const rows = entries.data ?? [];

  return (
    <Panel className="p-[clamp(18px,3vw,26px)]">
      <PanelHeader
        eyebrow="OVERSIGHT"
        title="Audit log"
        description="Every privileged action, newest first. Approvals, role grants, split changes and import commits all land here."
        actions={
          <TextInput
            type="search"
            aria-label="Filter by action"
            placeholder="claim.approve"
            value={action}
            onChange={(event) => setAction(event.target.value)}
            className="w-[220px] py-2.5 font-mono text-[12px]"
          />
        }
      />

      <div className="mt-5">
        {entries.loading && rows.length === 0 ? (
          <LoadingRows rows={5} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Nothing recorded"
            message={
              action
                ? `No entries for "${action}". The action name has to match exactly.`
                : "No privileged actions have been taken yet."
            }
          />
        ) : (
          <TableShell columns={["ACTION", "ENTITY", "ACTOR", "WHEN"]} minWidth={760}>
            {rows.map((entry) => (
              <Tr key={entry.id}>
                <Td>
                  <Badge tone={toneFor(entry.action)}>{entry.action}</Badge>
                </Td>
                <Td className="font-mono text-[10.5px] text-muted">
                  {entry.entityType ?? "—"}
                  {entry.entityId && (
                    <span className="block">{entry.entityId.slice(0, 18)}…</span>
                  )}
                </Td>
                <Td className="font-mono text-[10.5px] text-muted">
                  {entry.actorUserId ? `${entry.actorUserId.slice(0, 8)}…` : "system"}
                  {entry.ip && <span className="block">{entry.ip}</span>}
                </Td>
                <Td className="whitespace-nowrap text-muted">{dateTime(entry.createdAt)}</Td>
              </Tr>
            ))}
          </TableShell>
        )}
      </div>
    </Panel>
  );
}

/** The actions worth spotting at a glance are the ones that move money or access. */
function toneFor(action: string) {
  if (action.includes("approve") || action.includes("paid")) return "success" as const;
  if (action.includes("reject") || action.includes("refund") || action.includes("anonymise")) {
    return "danger" as const;
  }
  if (action.includes("role") || action.includes("commission") || action.includes("commit")) {
    return "warning" as const;
  }
  return "neutral" as const;
}

export { humanRole };
