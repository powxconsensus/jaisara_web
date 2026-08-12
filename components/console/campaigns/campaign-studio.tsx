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
  PageHeader,
  Panel,
  PanelHeader,
  RecordButton,
  RecordList,
  Segmented,
  StatTile,
  type Tone,
} from "@/components/console/ui";
import { useAccess } from "@/components/console/use-permissions";
import { cn } from "@/lib/cn";
import {
  compileHtml,
  compileText,
  isEmailDesign,
  starterDesign,
  type EmailDesign,
} from "@/lib/email-blocks";
import { consoleApi, errorMessage, useMutation, useResource } from "@/lib/console-api";
import { dateTime, relativeTime } from "@/lib/console-format";
import {
  ADMIN_PERMISSIONS as P,
  type AudiencePreview,
  type CampaignDetail,
  type CampaignStatus,
  type CampaignSummary,
  type SubscriberSummary,
} from "@/lib/admin-types";
import { BlockComposer } from "./block-composer";
import { SubjectFields } from "./campaign-editor";
import { CampaignStatsPanel } from "./campaign-stats";
import { SuppressionList } from "./suppression-list";

/**
 * The email studio.
 *
 * Two rules the UI has to make obvious, because they are what keep a marketing
 * send from becoming a compliance problem:
 *
 *  - The audience is resolved again at send time, so a preview is a snapshot,
 *    not a promise. Sending is gated on having taken that snapshot anyway,
 *    because "how many people is this going to" should never be a guess.
 *  - Once it is out, it is out. Cancelling stops what has not been queued yet
 *    and nothing more.
 */

const STATUS_TONE: Record<CampaignStatus, Tone> = {
  DRAFT: "neutral",
  SCHEDULED: "info",
  SENDING: "warning",
  SENT: "success",
  CANCELLED: "neutral",
  FAILED: "danger",
};

/**
 * A new campaign starts from blocks, not from a string of HTML.
 *
 * `bodyHtml` and `bodyText` are no longer edited directly - they are compiled
 * from `design` when the draft is saved. Keeping them out of this shape is what
 * stops the two drifting: there is now exactly one thing an author edits.
 */
const EMPTY = { name: "", subject: "", testEmails: "" };

export function CampaignStudio() {
  const { can } = useAccess();
  const { toast } = useToast();
  const [tab, setTab] = useState<"campaigns" | "suppressions">("campaigns");

  const canManage = can(P.marketingManage);
  const canSend = can(P.marketingSend);

  const campaigns = useResource<CampaignSummary[]>("/api/admin/marketing/campaigns");
  const subscribers = useResource<SubscriberSummary>("/api/admin/marketing/subscribers");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<CampaignStatus>("DRAFT");
  const [form, setForm] = useState(EMPTY);
  const [design, setDesign] = useState<EmailDesign>(starterDesign);
  const [preview, setPreview] = useState<AudiencePreview | null>(null);
  const [scheduledFor, setScheduledFor] = useState("");
  const [dialog, setDialog] = useState<"send" | "schedule" | "cancel" | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { mutate, pending, error, setError } = useMutation();
  const editable = canManage && (status === "DRAFT" || status === "SCHEDULED");

  const select = async (id: string) => {
    setLoadError(null);
    setPreview(null);
    try {
      const campaign = await consoleApi<CampaignDetail>(
        `/api/admin/marketing/campaigns/${id}`,
      );
      setSelectedId(campaign.id);
      setStatus(campaign.status);
      setScheduledFor(toLocalDateTime(campaign.scheduledFor));
      setForm({
        name: campaign.name,
        subject: campaign.subject,
        testEmails: campaign.audience?.testEmails?.join(", ") ?? "",
      });
      // A campaign drafted before the composer existed has no design. Rather
      // than reverse-engineering blocks out of its HTML - which would quietly
      // rewrite what somebody already approved - it opens on a fresh starter
      // and the stored HTML stays untouched until they save.
      setDesign(isEmailDesign(campaign.design) ? campaign.design : starterDesign());
    } catch (caught) {
      setLoadError(errorMessage(caught));
    }
  };

  const startNew = () => {
    setSelectedId(null);
    setStatus("DRAFT");
    setForm(EMPTY);
    setDesign(starterDesign());
    setPreview(null);
    setScheduledFor("");
    setLoadError(null);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const body = {
      name: form.name,
      subject: form.subject,
      // Compiled here, once, from the one thing the author edited.
      bodyHtml: compileHtml(design),
      bodyText: compileText(design),
      design,
      audience: form.testEmails.trim()
        ? {
            testEmails: form.testEmails
              .split(/[,\n]/)
              .map((email) => email.trim().toLowerCase())
              .filter(Boolean),
          }
        : {},
    };

    const saved = await mutate<CampaignDetail>(
      selectedId
        ? `/api/admin/marketing/campaigns/${selectedId}`
        : "/api/admin/marketing/campaigns",
      { method: selectedId ? "PATCH" : "POST", body },
    );
    setSaving(false);
    if (!saved) return;

    setSelectedId(saved.id);
    setStatus(saved.status);
    // The audience changed, so the recipient count on screen is now stale.
    setPreview(null);
    toast(selectedId ? "Campaign updated." : "Draft created.", "success");
    await campaigns.reload();
  };

  const previewAudience = async () => {
    if (!selectedId) return;
    const result = await mutate<AudiencePreview>(
      `/api/admin/marketing/campaigns/${selectedId}/preview`,
      { method: "GET" },
    );
    if (result) setPreview(result);
  };

  const act = async (action: "send" | "schedule" | "cancel") => {
    if (!selectedId) return;
    const result = await mutate<{ queued?: number }>(
      `/api/admin/marketing/campaigns/${selectedId}/${action}`,
      {
        body:
          action === "schedule"
            ? { scheduledFor: new Date(scheduledFor).toISOString() }
            : undefined,
      },
    );
    if (!result) return;

    setDialog(null);
    toast(
      action === "send"
        ? `Queued for ${result.queued ?? 0} recipient${result.queued === 1 ? "" : "s"}.`
        : action === "schedule"
          ? "Scheduled."
          : "Cancelled - anything already sent cannot be recalled.",
      action === "cancel" ? "warning" : "success",
    );
    await campaigns.reload();
    await select(selectedId);
  };

  const duplicate = async () => {
    if (!selectedId) return;
    const copy = await mutate<CampaignDetail>(
      `/api/admin/marketing/campaigns/${selectedId}/duplicate`,
    );
    if (!copy) return;
    toast("Reusable draft created.", "success");
    await campaigns.reload();
    await select(copy.id);
  };

  return (
    <div className={cn("flex flex-col", tab === "campaigns" && "console-fill")}>
      <PageHeader
        eyebrow="GROWTH"
        title="Email studio"
        description="Audience is resolved again at send time, so a fresh opt-out is always honoured."
        actions={
          <Segmented
            label="Studio section"
            value={tab}
            onChange={setTab}
            options={[
              { value: "campaigns", label: "Campaigns" },
              { value: "suppressions", label: "Suppressions" },
            ]}
          />
        }
      />

      {tab === "suppressions" ? (
        <SuppressionList />
      ) : (
        <div className="grid min-h-0 flex-1 gap-2 xl:grid-cols-[268px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col gap-2">
            {subscribers.data && (
              <div className="grid flex-none grid-cols-2 gap-2">
                <StatTile
                  label="REACHABLE"
                  value={subscribers.data.reachable.toLocaleString("en-US")}
                  tone="success"
                  hint="Opted in & verified."
                />
                <StatTile
                  label="OPTED IN"
                  value={subscribers.data.optedIn.toLocaleString("en-US")}
                />
                <StatTile
                  label="ACTIVE"
                  value={subscribers.data.activeMembers.toLocaleString("en-US")}
                />
                <StatTile
                  label="SUPPRESSED"
                  value={subscribers.data.suppressed.toLocaleString("en-US")}
                  tone={subscribers.data.suppressed > 0 ? "warning" : "neutral"}
                />
              </div>
            )}

            {canManage && (
              <Button className="w-full flex-none" onClick={startNew}>
                + New email
              </Button>
            )}

            <RecordList className="min-h-0 flex-1 max-xl:max-h-[36vh]">
              {campaigns.loading && !campaigns.data ? (
                <LoadingRows rows={4} />
              ) : (campaigns.data ?? []).length === 0 ? (
                <EmptyState title="No campaigns yet" message="Drafts appear here." />
              ) : (
                (campaigns.data ?? []).map((campaign) => (
                  <RecordButton
                    key={campaign.id}
                    active={selectedId === campaign.id}
                    onClick={() => void select(campaign.id)}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <Badge tone={STATUS_TONE[campaign.status]}>{campaign.status}</Badge>
                      {campaign._count && (
                        <span className="font-mono text-[9.5px] text-muted">
                          {campaign._count.deliveries}
                        </span>
                      )}
                    </span>
                    <strong className="mt-2 block truncate text-[12.5px]">{campaign.name}</strong>
                    <span className="mt-1 block truncate text-[11px] text-muted">
                      {campaign.subject}
                    </span>
                    <span className="mt-1 block font-mono text-[9px] tracking-[0.1em] text-muted">
                      {(campaign.sentAt || campaign.scheduledFor
                        ? relativeTime(campaign.sentAt ?? campaign.scheduledFor)
                        : relativeTime(campaign.createdAt)
                      ).toUpperCase()}
                    </span>
                  </RecordButton>
                ))
              )}
            </RecordList>
          </aside>

          {/* The editing pane scrolls on its own, so the campaign list and the
              audience figures stay visible while a long body is written -
              those numbers are the check somebody makes before sending. */}
          <div className="console-scroll min-h-0 min-w-0 space-y-2 overflow-y-auto pr-0.5">
            {loadError && <ErrorNote>{loadError}</ErrorNote>}

            {!selectedId && !canManage ? (
              <Panel>
                <EmptyState
                  title="Select a campaign"
                  message="You can read campaigns and their delivery stats. Drafting needs the marketing:manage permission."
                />
              </Panel>
            ) : (
              <Panel className="p-[var(--ct-pad)]">
                <PanelHeader
                  eyebrow={selectedId ? status : "NEW DRAFT"}
                  title={selectedId ? form.name || "Untitled email" : "Compose an email"}
                  actions={
                    !canManage ? <Badge tone="neutral">READ ONLY</Badge> : undefined
                  }
                />

                <form onSubmit={save} className="mt-3 grid gap-3">
                  <SubjectFields
                    name={form.name}
                    subject={form.subject}
                    disabled={!editable && Boolean(selectedId)}
                    onChange={(next) => setForm({ ...form, ...next })}
                  />

                  <div>
                    <FieldLabel>MESSAGE</FieldLabel>
                    <BlockComposer
                      design={design}
                      disabled={!editable && Boolean(selectedId)}
                      onChange={setDesign}
                    />
                  </div>

                  <div>
                    <FieldLabel htmlFor="campaign-tests">
                      TEST RECIPIENTS - LEAVE BLANK TO MAIL EVERY OPTED-IN MEMBER
                    </FieldLabel>
                    <TextInput
                      id="campaign-tests"
                      disabled={!editable && Boolean(selectedId)}
                      placeholder="you@example.com, teammate@example.com"
                      value={form.testEmails}
                      onChange={(event) =>
                        setForm({ ...form, testEmails: event.target.value })
                      }
                    />
                    <p className="mt-2 text-[11px] leading-5 text-muted">
                      With addresses here the send goes only to them - the safe way to see the
                      real thing in a real inbox before it reaches the member base.
                    </p>
                  </div>

                  {error && <ErrorNote>{error}</ErrorNote>}

                  <div className="flex flex-wrap gap-2">
                    {canManage && editable && (
                      <Button type="submit" size="lg" disabled={saving || pending}>
                        {saving ? "Saving…" : selectedId ? "Save changes" : "Create draft"}
                      </Button>
                    )}
                    {selectedId && (
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        disabled={pending}
                        onClick={() => void previewAudience()}
                      >
                        Preview audience
                      </Button>
                    )}
                    {selectedId && canManage && (
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        disabled={pending}
                        onClick={() => void duplicate()}
                      >
                        Duplicate as draft
                      </Button>
                    )}
                  </div>
                </form>

                {preview && (
                  <div
                    className="mt-5 rounded-[14px] border p-5"
                    style={{ borderColor: "color-mix(in oklab, var(--primary) 40%, transparent)" }}
                  >
                    <p className="font-mono text-[9px] tracking-[0.18em] text-primary">
                      AUDIENCE AS OF NOW
                    </p>
                    <p data-count className="mt-3 font-display text-[34px] font-black leading-none">
                      {preview.recipients.toLocaleString("en-US")}
                    </p>
                    <p className="mt-1.5 text-[12px] text-muted">{preview.audience}</p>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {Object.entries(preview.breakdown).map(([key, value]) => (
                        <span
                          key={key}
                          className="rounded-md border border-hair px-2.5 py-1.5 font-mono text-[9.5px] text-muted"
                        >
                          {key}: {value}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Panel>
            )}

            {selectedId && canSend && (status === "DRAFT" || status === "SCHEDULED") && (
              <Panel
                className="p-[var(--ct-pad)]"
                style={{ borderColor: "color-mix(in oklab, var(--warning) 40%, transparent)" }}
              >
                <PanelHeader
                  eyebrow="SEND CONTROL"
                  title="Delivery"
                  description="Preview the audience first - the button stays locked until you have seen the number you are about to mail."
                />

                <div className="mt-5 flex flex-wrap items-end gap-3">
                  <Button
                    size="lg"
                    disabled={pending || !preview}
                    onClick={() => setDialog("send")}
                    className="bg-warning text-black"
                  >
                    Send now
                  </Button>

                  <div className="min-w-[220px]">
                    <FieldLabel htmlFor="schedule-at">SCHEDULE FOR (YOUR LOCAL TIME)</FieldLabel>
                    <TextInput
                      id="schedule-at"
                      type="datetime-local"
                      value={scheduledFor}
                      onChange={(event) => setScheduledFor(event.target.value)}
                    />
                  </div>
                  <Button
                    size="lg"
                    variant="outline"
                    disabled={pending || !scheduledFor}
                    onClick={() => setDialog("schedule")}
                  >
                    Schedule
                  </Button>

                  {status === "SCHEDULED" && (
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-danger text-danger"
                      disabled={pending}
                      onClick={() => setDialog("cancel")}
                    >
                      Cancel send
                    </Button>
                  )}
                </div>

                {!preview && (
                  <p className="mt-3.5 text-[11.5px] leading-5 text-muted">
                    Run <strong className="text-fg">Preview audience</strong> above to unlock
                    sending.
                  </p>
                )}
              </Panel>
            )}

            {selectedId && (status === "SENT" || status === "SENDING" || status === "FAILED") && (
              <Panel className="p-[var(--ct-pad)]">
                <PanelHeader eyebrow="RESULTS" title="Delivery outcomes" />
                <div className="mt-3">
                  <CampaignStatsPanel campaignId={selectedId} />
                </div>
              </Panel>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={dialog === "send"}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
          setError(null);
        }}
        title="Send this campaign now?"
        confirmLabel="Send it"
        pending={pending}
        error={error}
        onConfirm={() => act("send")}
        summary={
          <>
            Going out to roughly{" "}
            <strong className="text-fg">
              {preview?.recipients.toLocaleString("en-US") ?? "the opted-in audience"}
            </strong>{" "}
            {form.testEmails.trim() ? "test addresses" : "members"}, with the subject{" "}
            <strong className="text-fg">&ldquo;{form.subject}&rdquo;</strong>.
            <br />
            <br />
            The list is rebuilt at send time, so anyone who opted out since your preview is
            dropped. Once it leaves, it cannot be recalled.
          </>
        }
      />

      <ConfirmDialog
        open={dialog === "schedule"}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
          setError(null);
        }}
        title="Schedule this campaign?"
        confirmLabel="Schedule"
        pending={pending}
        error={error}
        onConfirm={() => act("schedule")}
        summary={
          <>
            It will be sent automatically at{" "}
            <strong className="text-fg">
              {scheduledFor ? dateTime(new Date(scheduledFor).toISOString()) : "the chosen time"}
            </strong>
            . You can still edit or cancel it until then.
          </>
        }
      />

      <ConfirmDialog
        open={dialog === "cancel"}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
          setError(null);
        }}
        title="Cancel this send?"
        intent="danger"
        confirmLabel="Cancel the send"
        pending={pending}
        error={error}
        onConfirm={() => act("cancel")}
        summary={
          <>
            The campaign returns to a draft state and will not go out at the scheduled time.
            Anything already delivered stays delivered.
          </>
        }
      />
    </div>
  );
}

function toLocalDateTime(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}
