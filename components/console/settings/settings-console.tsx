"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldLabel, TextInput } from "@/components/ui/field";
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
import { useMutation, useResource } from "@/lib/resource";
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
      {tab === "tiers" && (
        <>
          <ClubControls />
          <TierTable />
        </>
      )}
      {tab === "settings" && <SettingsTable />}
      {tab === "audit" && <AuditLog />}
    </div>
  );
}

/**
 * How the Club is actually run, in one place.
 *
 * These three values were reachable only as raw rows in the Settings tab -
 * `club_score_per_referral` next to `email_tracking_enabled`, with no
 * indication that they were the formula deciding everybody's tier. And one of
 * them was not reachable at all: the per-dollar rate was hard-coded inside the
 * calculation.
 *
 * Shown above the tier table because the order is the causal one. A tier's
 * threshold is meaningless without knowing how the score that meets it is
 * earned, and the score is the thing nobody could see.
 */
function ClubControls() {
  const { can } = useAccess();
  const { toast } = useToast();
  const settings = useResource<Setting[]>("/api/admin/config/settings");
  const { mutate, pending, error, setError } = useMutation();

  const canManage = can(P.configManage);
  const byKey = new Map((settings.data ?? []).map((row) => [row.key, row]));

  const enabled = Number(byKey.get("club_enabled")?.value ?? 1) !== 0;
  const perReferral = String(byKey.get("club_score_per_referral")?.value ?? 100);
  const perUsd = String(byKey.get("club_score_per_usd")?.value ?? 1);

  const [draftReferral, setDraftReferral] = useState<string | null>(null);
  const [draftUsd, setDraftUsd] = useState<string | null>(null);

  const referralValue = draftReferral ?? perReferral;
  const usdValue = draftUsd ?? perUsd;
  const scoringChanged = referralValue !== perReferral || usdValue !== perUsd;

  const write = async (key: string, value: number | boolean, note: string) => {
    const saved = await mutate(`/api/admin/config/settings/${encodeURIComponent(key)}`, {
      method: "PATCH",
      body: { value },
    });
    if (!saved) return false;
    toast(note, "success");
    await settings.reload();
    return true;
  };

  const saveScoring = async () => {
    const referral = Number(referralValue);
    const usd = Number(usdValue);
    if (!Number.isFinite(referral) || !Number.isFinite(usd)) {
      setError("Both rates have to be numbers.");
      return;
    }

    if (!(await write("club_score_per_referral", referral, "Referral rate saved."))) return;
    if (!(await write("club_score_per_usd", usd, "Volume rate saved."))) return;
    setDraftReferral(null);
    setDraftUsd(null);
  };

  return (
    <Panel className="p-[var(--ct-pad)]">
      <PanelHeader
        eyebrow="JAISARA CLUB"
        title="How the club runs"
        description="Whether members can see it, and how the score that decides their tier is earned."
      />

      <div className="mt-5 flex flex-wrap items-start justify-between gap-x-6 gap-y-3 rounded-[12px] border border-hair bg-surface-2 px-4 py-3.5">
        <div className="max-w-[60ch]">
          <p className="text-[13px] font-semibold">
            {enabled ? "The club is open" : "The club shows as coming soon"}
          </p>
          {/* The single most important thing to say here. Somebody switching
              this off needs to know it is not a way to stop paying referrers -
              that lives in the split, which is versioned and audited. */}
          <p className="mt-1.5 text-[11.5px] leading-[1.6] text-muted">
            Display only. Referrers keep earning their share of every commission either way, and
            balances already earned are untouched - what a referrer is paid is set by the split, not
            by this switch.
          </p>
        </div>
        {canManage && (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              void write(
                "club_enabled",
                enabled ? 0 : 1,
                enabled ? "The club now shows as coming soon." : "The club is open.",
              )
            }
          >
            {enabled ? "Switch off" : "Switch on"}
          </Button>
        )}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <FieldLabel htmlFor="club-per-referral">SCORE PER QUALIFIED REFERRAL</FieldLabel>
          <TextInput
            id="club-per-referral"
            inputMode="numeric"
            disabled={!canManage}
            value={referralValue}
            onChange={(event) => setDraftReferral(event.target.value)}
          />
          <p className="mt-2 text-[11px] leading-[1.5] text-muted">
            A referral only counts once that member has actually bought something.
          </p>
        </div>
        <div>
          <FieldLabel htmlFor="club-per-usd">SCORE PER $1 OF COMMISSION</FieldLabel>
          <TextInput
            id="club-per-usd"
            inputMode="decimal"
            disabled={!canManage}
            value={usdValue}
            onChange={(event) => setDraftUsd(event.target.value)}
          />
          <p className="mt-2 text-[11px] leading-[1.5] text-muted">
            Commission the member has generated, across their own purchases and their referrals&rsquo;.
          </p>
        </div>
      </div>

      <p className="mt-4 rounded-[10px] border border-hair px-3.5 py-3 font-mono text-[11px] leading-[1.7] text-muted">
        score = qualified referrals × {referralValue || 0} + commission $ × {usdValue || 0}
        <span className="mt-1.5 block font-sans text-[11px]">
          Club score is status only. It decides which tier somebody reaches and is never
          redeemable - wallet points are the money, and they come from the split.
        </span>
      </p>

      {error && (
        <div className="mt-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      {canManage && (
        <div className="mt-4">
          <Button disabled={pending || !scoringChanged} onClick={() => void saveScoring()}>
            {pending ? "Saving…" : "Save scoring"}
          </Button>
        </div>
      )}
    </Panel>
  );
}

const EMPTY_TIER = {
  key: "",
  name: "",
  rank: "",
  minQualifiedReferrals: "0",
  minLifetimeVolumeUsd: "0",
  buyerPct: "",
  referrerPct: "",
  platformPct: "",
  description: "",
};

/**
 * Club tiers, and what reaching one is worth.
 *
 * This was read-only, which made the club unusable as a lever: the API could
 * create and edit tiers but nothing in the console reached it, so changing what
 * a tier pays meant a database write. A tier's split is the whole point of
 * having tiers - it is the rate a member is being promised for referring
 * people - so it has to be editable by the person accountable for it.
 *
 * A tier either carries all three split percentages or none. Half a split is
 * not a thing the ledger can apply, and letting it be saved would leave the
 * override silently ignored.
 */
function TierTable() {
  const { can } = useAccess();
  const { toast } = useToast();
  const tiers = useResource<ClubTier[]>("/api/admin/config/tiers");
  const { mutate, pending, error, setError } = useMutation();

  const [form, setForm] = useState(EMPTY_TIER);
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const canManage = can(P.tierManage);
  const rows = tiers.data ?? [];

  const edit = (tier: ClubTier) => {
    setEditingKey(tier.key);
    setError(null);
    setForm({
      key: tier.key,
      name: tier.name,
      rank: String(tier.rank),
      minQualifiedReferrals: String(tier.minQualifiedReferrals),
      minLifetimeVolumeUsd: tier.minLifetimeVolumeUsd,
      buyerPct: tier.buyerPct ?? "",
      referrerPct: tier.referrerPct ?? "",
      platformPct: tier.platformPct ?? "",
      description: tier.description ?? "",
    });
  };

  const split = [form.buyerPct, form.referrerPct, form.platformPct];
  const splitFilled = split.filter((value) => value.trim()).length;
  const splitTotal = split.reduce((sum, value) => sum + (Number(value) || 0), 0);
  const splitPartial = splitFilled > 0 && splitFilled < 3;
  const splitMisadds = splitFilled === 3 && Math.abs(splitTotal - 100) > 0.001;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();

    const saved = await mutate<ClubTier>("/api/admin/config/tiers", {
      body: {
        key: form.key.trim().toLowerCase(),
        name: form.name.trim(),
        rank: Number(form.rank),
        minQualifiedReferrals: Number(form.minQualifiedReferrals || 0),
        minLifetimeVolumeUsd: form.minLifetimeVolumeUsd.trim() || "0",
        buyerPct: form.buyerPct.trim() || undefined,
        referrerPct: form.referrerPct.trim() || undefined,
        platformPct: form.platformPct.trim() || undefined,
        description: form.description.trim() || undefined,
      },
    });
    if (!saved) return;

    toast(editingKey ? "Tier saved." : "Tier created.", "success");
    setForm(EMPTY_TIER);
    setEditingKey(null);
    await tiers.reload();
  };

  return (
    <div className="space-y-2">
      <Panel className="p-[var(--ct-pad)]">
        <PanelHeader
          eyebrow="JAISARA CLUB"
          title="Tiers"
          description="A tier can carry its own split, which overrides the scope default for members who reach it."
        />
        <div className="mt-3">
          {tiers.loading && rows.length === 0 ? (
            <LoadingRows rows={3} />
          ) : rows.length === 0 ? (
            <EmptyState title="No tiers" message="The club has no tiers configured yet." />
          ) : (
            <TableShell
              columns={["TIER", "RANK", "QUALIFIES AT", "OWN SPLIT", "MEMBERS", ""]}
              minWidth={760}
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
                  <Td>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => edit(tier)}
                        className="cursor-pointer font-mono text-[9.5px] tracking-[0.13em] text-primary hover:underline"
                      >
                        EDIT
                      </button>
                    )}
                  </Td>
                </Tr>
              ))}
            </TableShell>
          )}
        </div>
      </Panel>

      {canManage && (
        <Panel className="p-[var(--ct-pad)]">
          <form onSubmit={save}>
            <PanelHeader
              eyebrow={editingKey ? `EDITING ${editingKey.toUpperCase()}` : "NEW TIER"}
              title={editingKey ? "Edit tier" : "Add a tier"}
              description="Members move between tiers automatically as referrals and volume are recalculated. Changing a split changes what everyone on that tier earns from their next approved claim."
              actions={
                editingKey ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingKey(null);
                      setForm(EMPTY_TIER);
                      setError(null);
                    }}
                  >
                    Cancel
                  </Button>
                ) : undefined
              }
            />

            <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <FieldLabel htmlFor="tier-key">KEY</FieldLabel>
                <TextInput
                  id="tier-key"
                  required
                  maxLength={30}
                  // The key is the identity: editing it would create a second
                  // tier rather than rename this one.
                  disabled={editingKey !== null}
                  placeholder="silver"
                  value={form.key}
                  onChange={(event) => setForm({ ...form, key: event.target.value })}
                />
              </div>
              <div>
                <FieldLabel htmlFor="tier-name">NAME</FieldLabel>
                <TextInput
                  id="tier-name"
                  required
                  maxLength={40}
                  placeholder="Silver"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                />
              </div>
              <div>
                <FieldLabel htmlFor="tier-rank">RANK</FieldLabel>
                <TextInput
                  id="tier-rank"
                  required
                  inputMode="numeric"
                  placeholder="2"
                  value={form.rank}
                  onChange={(event) => setForm({ ...form, rank: event.target.value })}
                />
                <p className="mt-2 text-[11px] text-muted">Higher outranks lower.</p>
              </div>
              <div>
                <FieldLabel htmlFor="tier-referrals">QUALIFIES AT - REFERRALS</FieldLabel>
                <TextInput
                  id="tier-referrals"
                  inputMode="numeric"
                  value={form.minQualifiedReferrals}
                  onChange={(event) =>
                    setForm({ ...form, minQualifiedReferrals: event.target.value })
                  }
                />
              </div>
              <div>
                <FieldLabel htmlFor="tier-volume">QUALIFIES AT - VOLUME (USD)</FieldLabel>
                <TextInput
                  id="tier-volume"
                  inputMode="decimal"
                  value={form.minLifetimeVolumeUsd}
                  onChange={(event) =>
                    setForm({ ...form, minLifetimeVolumeUsd: event.target.value })
                  }
                />
                <p className="mt-2 text-[11px] text-muted">Either threshold qualifies.</p>
              </div>
              <div>
                <FieldLabel htmlFor="tier-buyer">BUYER %</FieldLabel>
                <TextInput
                  id="tier-buyer"
                  inputMode="decimal"
                  placeholder="-"
                  value={form.buyerPct}
                  onChange={(event) => setForm({ ...form, buyerPct: event.target.value })}
                />
              </div>
              <div>
                <FieldLabel htmlFor="tier-referrer">REFERRER %</FieldLabel>
                <TextInput
                  id="tier-referrer"
                  inputMode="decimal"
                  placeholder="-"
                  value={form.referrerPct}
                  onChange={(event) => setForm({ ...form, referrerPct: event.target.value })}
                />
              </div>
              <div>
                <FieldLabel htmlFor="tier-platform">PLATFORM %</FieldLabel>
                <TextInput
                  id="tier-platform"
                  inputMode="decimal"
                  placeholder="-"
                  value={form.platformPct}
                  onChange={(event) => setForm({ ...form, platformPct: event.target.value })}
                />
              </div>
            </div>

            <div className="mt-4">
              <FieldLabel htmlFor="tier-description">DESCRIPTION</FieldLabel>
              <TextInput
                id="tier-description"
                maxLength={200}
                placeholder="What reaching this tier means"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </div>

            {/* Caught here rather than at the API, because the API accepts a
                partial split and simply never applies it - a silent no-op is
                the worst outcome for a field that decides what people earn. */}
            {splitPartial && (
              <p className="mt-4 text-[12px] text-warning">
                A tier split needs all three percentages, or none. Leave them all blank to use the
                scope default.
              </p>
            )}
            {splitMisadds && (
              <p className="mt-4 text-[12px] text-warning">
                The three shares total {splitTotal}%. They have to add up to 100.
              </p>
            )}
            {error && (
              <div className="mt-4">
                <ErrorNote>{error}</ErrorNote>
              </div>
            )}

            <div className="mt-3">
              <Button
                type="submit"
                size="lg"
                disabled={pending || splitPartial || splitMisadds}
              >
                {pending ? "Saving…" : editingKey ? "Save tier" : "Create tier"}
              </Button>
            </div>
          </form>
        </Panel>
      )}
    </div>
  );
}

function SettingsTable() {
  const { can, roles } = useAccess();
  // The API is the gate; this only stops somebody being offered a form that
  // can only end in a 403 they cannot act on.
  const isOwner = roles.includes("owner");
  const { toast } = useToast();
  const settings = useResource<Setting[]>("/api/admin/config/settings");
  const { mutate, pending, error, setError } = useMutation();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  /**
   * The emailed confirmation, for the one setting that needs it.
   *
   * `points_per_usd` is the meaning of every stored balance - points are what
   * the ledger holds and dollars are derived - so changing it restates
   * everybody's money at once. The API refuses it outright once points exist,
   * and while it is still changeable it demands a code sent to the owner's
   * mailbox. This is the console half of that: request, then enter.
   */
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);

  const canManage = can(P.configManage);
  const rows = settings.data ?? [];

  /** Kept in step with `SettingsService.isConversionRate` on the API. */
  const needsCode = (key: string) => key === "points_per_usd";

  const parseValue = (raw: string): string | number | boolean => {
    const trimmed = raw.trim();
    const numeric = trimmed !== "" && Number.isFinite(Number(trimmed));
    return trimmed === "true" ? true : trimmed === "false" ? false : numeric ? Number(trimmed) : raw;
  };

  const requestCode = async (key: string) => {
    const sent = await mutate(
      `/api/admin/config/settings/${encodeURIComponent(key)}/confirmation-code`,
      { body: { value: parseValue(draft) } },
    );
    if (!sent) return;
    setCodeSent(true);
    toast("Confirmation code sent to your email.", "success");
  };

  const stopEditing = () => {
    setEditing(null);
    setCode("");
    setCodeSent(false);
  };

  const save = async (key: string) => {
    // Numbers and booleans are stored as such; only fall back to a string when
    // the input is neither, so a "30" does not become the string "30".
    //
    // The test is on shape, not truthiness. Truthiness sent zero through as the
    // string "0" - so setting a hold period or a minimum to 0 stored a type the
    // API then had to guess at. Blank stays blank rather than becoming 0.
    const parsed = parseValue(draft);

    const saved = await mutate(`/api/admin/config/settings/${encodeURIComponent(key)}`, {
      method: "PATCH",
      body: needsCode(key) ? { value: parsed, confirmationCode: code.trim() } : { value: parsed },
    });
    if (!saved) return;
    toast(`${key} updated.`, "success");
    stopEditing();
    await settings.reload();
  };

  return (
    <Panel className="p-[var(--ct-pad)]">
      <PanelHeader
        eyebrow="KNOBS"
        title="Settings"
        description="Singleton values the API reads at runtime. Changes take effect immediately - the service cache is invalidated on write."
      />

      {error && (
        <div className="mt-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      <div className="mt-3">
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
                    <div className="space-y-2">
                      <TextInput
                        autoFocus
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        className="max-w-[220px] py-2 font-mono text-[12px]"
                      />
                      {/* The warning is here, next to the field, rather than in
                          the panel description. By the time somebody is typing
                          a new rate they have stopped reading headers. */}
                      {needsCode(setting.key) && !isOwner && (
                        <p className="max-w-[320px] text-[11px] leading-[1.5] text-warning">
                          Only an owner can change this. It is the meaning of every stored balance -
                          changing it restates everyone&rsquo;s money at once.
                        </p>
                      )}
                      {needsCode(setting.key) && isOwner && (
                        <div className="max-w-[320px] space-y-2">
                          <p className="text-[11px] leading-[1.5] text-warning">
                            This is the meaning of every stored balance, not a display setting.
                            Changing it restates everyone&rsquo;s money at once, so it needs a code
                            from your email.
                          </p>
                          <TextInput
                            value={code}
                            placeholder="CONFIRMATION CODE"
                            onChange={(event) => setCode(event.target.value)}
                            className="max-w-[220px] py-2 font-mono text-[12px] tracking-[0.14em]"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={pending || !draft.trim()}
                            onClick={() => void requestCode(setting.key)}
                          >
                            {codeSent ? "Resend code" : "Email me a code"}
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="font-mono text-[11.5px]">{JSON.stringify(setting.value)}</span>
                  )}
                </Td>
                <Td className="whitespace-nowrap text-muted">{dateTime(setting.updatedAt)}</Td>
                <Td>
                  {canManage &&
                    (editing === setting.key ? (
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          // Disabled without a code rather than letting the save
                          // 400: the requirement is knowable here, and finding
                          // out by failing is worse than being told.
                          disabled={
                            pending ||
                            (needsCode(setting.key) && (!isOwner || !code.trim()))
                          }
                          onClick={() => void save(setting.key)}
                        >
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={stopEditing}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setError(null);
                          setCode("");
                          setCodeSent(false);
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
    <Panel className="p-[var(--ct-pad)]">
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

      <div className="mt-3">
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
                  {entry.entityType ?? "-"}
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
