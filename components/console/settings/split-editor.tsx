"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldLabel, TextInput } from "@/components/ui/field";
import { useToast } from "@/components/shell/toast";
import { ConfirmDialog } from "@/components/console/confirm-dialog";
import {
  Badge,
  EmptyState,
  ErrorNote,
  LoadingRows,
  Panel,
  PanelHeader,
  Select,
  TableShell,
  Td,
  Textarea,
  Tr,
} from "@/components/console/ui";
import { useAccess } from "@/components/console/use-permissions";
import { useMutation, useResource } from "@/lib/console-api";
import { shortDate } from "@/lib/console-format";
import {
  ADMIN_PERMISSIONS as P,
  type CommissionRule,
  type Platform,
} from "@/lib/admin-types";

/**
 * The commission split.
 *
 * Three properties this screen has to hold, all of them the reason money is
 * correct rather than approximately correct:
 *
 *  - **x + y + z = 100.** The database enforces it with a CHECK constraint, so
 *    a bad split is a 500 rather than a silent 97%. The form does the sum live
 *    so nobody meets that constraint by surprise.
 *  - **Splits are versioned, never edited.** Saving closes the current rule and
 *    opens a successor. A conversion freezes the rule that applied at the time,
 *    so changing the split tomorrow must not rewrite what was paid yesterday.
 *  - **Scope is a hierarchy.** A rule on one firm overrides the global one, so
 *    the effect of a global change is not "everyone" if overrides exist.
 */

type Scope = CommissionRule["scope"];

export function SplitEditor() {
  const { can } = useAccess();
  const { toast } = useToast();
  const rules = useResource<CommissionRule[]>("/api/admin/config/splits");
  const platforms = useResource<Platform[]>("/api/admin/catalog/platforms", {
    enabled: can(P.platformView),
  });
  const { mutate, pending, error, setError } = useMutation();

  const canManage = can(P.configManage);
  const [confirming, setConfirming] = useState(false);
  const [form, setForm] = useState({
    scope: "GLOBAL" as Scope,
    scopeId: "",
    buyerPct: "50",
    referrerPct: "10",
    platformPct: "40",
    noReferrerPolicy: "TO_PLATFORM" as "TO_PLATFORM" | "TO_BUYER",
    holdDays: 30,
    holdAnchor: "PURCHASE_DATE" as "PURCHASE_DATE" | "APPROVAL_DATE",
    note: "",
  });

  const total =
    Number(form.buyerPct || 0) + Number(form.referrerPct || 0) + Number(form.platformPct || 0);
  const balanced = Math.abs(total - 100) < 0.005;

  const save = async () => {
    const saved = await mutate<CommissionRule>("/api/admin/config/splits", {
      body: {
        scope: form.scope,
        scopeId: form.scope === "GLOBAL" ? undefined : form.scopeId || undefined,
        buyerPct: form.buyerPct,
        referrerPct: form.referrerPct,
        platformPct: form.platformPct,
        noReferrerPolicy: form.noReferrerPolicy,
        holdDays: form.holdDays,
        holdAnchor: form.holdAnchor,
        note: form.note.trim() || undefined,
      },
    });
    if (!saved) return;

    setConfirming(false);
    toast("New split in force. Existing conversions keep the old one.", "success");
    await rules.reload();
  };

  const load = (rule: CommissionRule) => {
    setForm({
      scope: rule.scope,
      scopeId: rule.scopeId ?? "",
      buyerPct: rule.buyerPct,
      referrerPct: rule.referrerPct,
      platformPct: rule.platformPct,
      noReferrerPolicy: rule.noReferrerPolicy,
      holdDays: rule.holdDays,
      holdAnchor: rule.holdAnchor,
      note: "",
    });
  };

  const current = rules.data ?? [];
  const scopeName = (rule: CommissionRule) =>
    rule.scope === "GLOBAL"
      ? "Everything"
      : (platforms.data?.find((platform) => platform.id === rule.scopeId)?.name ??
        `${rule.scope} ${rule.scopeId?.slice(0, 8) ?? ""}`);

  return (
    <div className="space-y-4">
      <Panel className="p-[clamp(18px,3vw,26px)]">
        <PanelHeader
          eyebrow="IN FORCE"
          title="Current splits"
          description="A rule on a firm, product or coupon overrides the global one. Cashback is always a share of the commission we are paid, never of the buyer's price."
        />
        <div className="mt-5">
          {rules.loading && current.length === 0 ? (
            <LoadingRows rows={3} />
          ) : current.length === 0 ? (
            <EmptyState
              title="No split configured"
              message="Nothing can be approved until a global split exists."
            />
          ) : (
            <TableShell
              columns={["SCOPE", "BUYER", "REFERRER", "PLATFORM", "HOLD", "SINCE", ""]}
              minWidth={820}
            >
              {current.map((rule) => (
                <Tr key={rule.id}>
                  <Td>
                    <Badge tone={rule.scope === "GLOBAL" ? "primary" : "info"}>{rule.scope}</Badge>
                    <span className="mt-1.5 block text-[11.5px] text-muted">
                      {scopeName(rule)}
                    </span>
                    {rule.tierKey && (
                      <span className="mt-1 block font-mono text-[9.5px] text-muted">
                        tier {rule.tierKey}
                      </span>
                    )}
                  </Td>
                  <Td data-count className="font-mono text-[13px] text-primary">
                    {rule.buyerPct}%
                  </Td>
                  <Td data-count className="font-mono text-[13px]">
                    {rule.referrerPct}%
                  </Td>
                  <Td data-count className="font-mono text-[13px]">
                    {rule.platformPct}%
                  </Td>
                  <Td className="whitespace-nowrap text-muted">
                    {rule.holdDays}d from{" "}
                    {rule.holdAnchor === "PURCHASE_DATE" ? "purchase" : "approval"}
                  </Td>
                  <Td className="whitespace-nowrap text-muted">
                    {shortDate(rule.effectiveFrom)}
                  </Td>
                  <Td>
                    {canManage && (
                      <Button size="sm" variant="outline" onClick={() => load(rule)}>
                        Base new on this
                      </Button>
                    )}
                  </Td>
                </Tr>
              ))}
            </TableShell>
          )}
        </div>
      </Panel>

      {canManage ? (
        <Panel className="p-[clamp(18px,3vw,26px)]">
          <PanelHeader
            eyebrow="CHANGE"
            title="Set a new split"
            description="This closes the rule currently in force and opens a successor. Conversions already recorded keep the rule that applied when they were approved."
          />

          <form
            className="mt-6 grid gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              setError(null);
              setConfirming(true);
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <FieldLabel htmlFor="split-scope">APPLIES TO</FieldLabel>
                <Select
                  id="split-scope"
                  value={form.scope}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      scope: event.target.value as Scope,
                      scopeId: "",
                    })
                  }
                >
                  <option value="GLOBAL">Everything (global default)</option>
                  <option value="PLATFORM">One firm</option>
                  <option value="PRODUCT">One challenge</option>
                  <option value="COUPON">One coupon</option>
                </Select>
              </div>
              {form.scope === "PLATFORM" && (
                <div>
                  <FieldLabel htmlFor="split-platform">FIRM</FieldLabel>
                  <Select
                    id="split-platform"
                    required
                    value={form.scopeId}
                    onChange={(event) => setForm({ ...form, scopeId: event.target.value })}
                  >
                    <option value="">Select a firm…</option>
                    {(platforms.data ?? []).map((platform) => (
                      <option key={platform.id} value={platform.id}>
                        {platform.name}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              {(form.scope === "PRODUCT" || form.scope === "COUPON") && (
                <div>
                  <FieldLabel htmlFor="split-scope-id">
                    {form.scope === "PRODUCT" ? "CHALLENGE ID" : "COUPON ID"}
                  </FieldLabel>
                  <TextInput
                    id="split-scope-id"
                    required
                    value={form.scopeId}
                    onChange={(event) => setForm({ ...form, scopeId: event.target.value })}
                    placeholder="uuid"
                  />
                </div>
              )}
            </div>

            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-[9.5px] tracking-[0.16em] text-muted">
                  SHARE OF EVERY COMMISSION
                </p>
                <span
                  data-count
                  className="font-mono text-[12px]"
                  style={{ color: balanced ? "var(--success)" : "var(--danger)" }}
                >
                  {total.toFixed(2)}% {balanced ? "✓" : "— must be exactly 100"}
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {(
                  [
                    ["buyerPct", "BUYER (CASHBACK)", "x"],
                    ["referrerPct", "REFERRER", "y"],
                    ["platformPct", "PLATFORM", "z"],
                  ] as const
                ).map(([key, label, symbol]) => (
                  <div key={key}>
                    <FieldLabel htmlFor={`split-${key}`}>
                      {label} · {symbol}
                    </FieldLabel>
                    <TextInput
                      id={`split-${key}`}
                      required
                      inputMode="decimal"
                      value={form[key]}
                      onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                      className="font-mono"
                    />
                  </div>
                ))}
              </div>

              {/* The split as a bar — three percentages read as numbers, but
                  what an owner is deciding is a proportion. */}
              <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-surface-2">
                <span
                  className="bg-primary"
                  style={{ width: `${Math.min(100, Number(form.buyerPct) || 0)}%` }}
                />
                <span
                  style={{
                    width: `${Math.min(100, Number(form.referrerPct) || 0)}%`,
                    background: "var(--info)",
                  }}
                />
                <span
                  style={{
                    width: `${Math.min(100, Number(form.platformPct) || 0)}%`,
                    background: "var(--text-muted)",
                  }}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <FieldLabel htmlFor="split-no-referrer">WHEN THERE IS NO REFERRER</FieldLabel>
                <Select
                  id="split-no-referrer"
                  value={form.noReferrerPolicy}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      noReferrerPolicy: event.target.value as "TO_PLATFORM" | "TO_BUYER",
                    })
                  }
                >
                  <option value="TO_PLATFORM">Their share goes to the platform</option>
                  <option value="TO_BUYER">Their share goes to the buyer</option>
                </Select>
              </div>
              <div>
                <FieldLabel htmlFor="split-hold">HOLD PERIOD (DAYS)</FieldLabel>
                <TextInput
                  id="split-hold"
                  type="number"
                  min={0}
                  max={365}
                  required
                  value={form.holdDays}
                  onChange={(event) =>
                    setForm({ ...form, holdDays: Number(event.target.value) })
                  }
                  className="font-mono"
                />
              </div>
              <div>
                <FieldLabel htmlFor="split-anchor">COUNTED FROM</FieldLabel>
                <Select
                  id="split-anchor"
                  value={form.holdAnchor}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      holdAnchor: event.target.value as "PURCHASE_DATE" | "APPROVAL_DATE",
                    })
                  }
                >
                  <option value="PURCHASE_DATE">The purchase date</option>
                  <option value="APPROVAL_DATE">The approval date</option>
                </Select>
              </div>
            </div>

            <p className="text-[11.5px] leading-5 text-muted">
              The hold is the buffer against refunds: cashback sits as pending until it elapses,
              so a chargeback lands before the money is withdrawable. Counting from the purchase
              date means a slow review does not extend the member&rsquo;s wait.
            </p>

            <div>
              <FieldLabel htmlFor="split-note">WHY (RECORDED IN THE AUDIT LOG)</FieldLabel>
              <Textarea
                id="split-note"
                rows={2}
                maxLength={300}
                value={form.note}
                onChange={(event) => setForm({ ...form, note: event.target.value })}
                className="min-h-[70px]"
                placeholder="e.g. Raising the buyer share for the August campaign"
              />
            </div>

            {error && <ErrorNote>{error}</ErrorNote>}

            <div>
              <Button type="submit" size="lg" disabled={pending || !balanced}>
                Review this change
              </Button>
              {!balanced && (
                <p className="mt-2 text-[11.5px] text-danger">
                  The three shares must total exactly 100%.
                </p>
              )}
            </div>
          </form>
        </Panel>
      ) : (
        <Panel>
          <EmptyState
            title="Read-only"
            message="Changing the split is owner-level (config:manage). Deliberately not granted to admins — it is what the platform keeps."
          />
        </Panel>
      )}

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Put this split in force?"
        confirmLabel="Set the split"
        pending={pending}
        error={error}
        onConfirm={save}
        summary={
          <>
            From now on, every commission on{" "}
            <strong className="text-fg">
              {form.scope === "GLOBAL" ? "everything without its own rule" : "this scope"}
            </strong>{" "}
            splits <strong className="text-fg">{form.buyerPct}%</strong> to the buyer,{" "}
            <strong className="text-fg">{form.referrerPct}%</strong> to their referrer and{" "}
            <strong className="text-fg">{form.platformPct}%</strong> to the platform, held for{" "}
            <strong className="text-fg">{form.holdDays} days</strong>.
            <br />
            <br />
            Conversions already approved are untouched — each one froze the rule that applied at
            the time, and this does not rewrite them.
          </>
        }
      />
    </div>
  );
}
