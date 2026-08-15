"use client";

import { useState } from "react";
import { BlockComposer } from "@/components/console/campaigns/block-composer";
import { useAccess } from "@/components/console/use-permissions";
import {
  Badge,
  ErrorNote,
  LoadingRows,
  Panel,
  PanelHeader,
  RecordButton,
  RecordList,
} from "@/components/console/ui";
import { Button } from "@/components/ui/button";
import { FieldLabel, TextInput } from "@/components/ui/field";
import { useToast } from "@/components/shell/toast";
import { useMutation, useResource } from "@/lib/console-api";
import { ADMIN_PERMISSIONS as P } from "@/lib/admin-types";
import type { EmailDesign } from "@/lib/email-blocks";

/**
 * Editing the wording of the emails the application sends.
 *
 * The shape of this screen is a deliberate argument with the tool that
 * inspired it. A panel of eleven numeric style fields with unit dropdowns is a
 * page you have to learn; and it buys very little, because an email is 600px
 * of text in a client that discards half your CSS. So there is no style
 * inspector here. There are the blocks, the fields an email actually needs,
 * and the three actions in the order you do them: write it, prove it, turn it
 * on.
 *
 * The safety story is the same one the API tells, said in the interface:
 * nothing you do here can stop an email being sent. Every message has a
 * built-in version that keeps working, "Live" means yours is being used
 * instead, and reverting is one button.
 */

type Status = "DRAFT" | "ACTIVE";

interface TemplateRow {
  key: string;
  /** A message the app sends automatically. Its key cannot be renamed. */
  system: boolean;
  required: string[];
  available: string[];
  starter: { name: string; subject: string; preheader: string; design: EmailDesign } | null;
  template: {
    key: string;
    name: string;
    category: string;
    subject: string;
    preheader: string | null;
    replyTo: string | null;
    design: EmailDesign;
    status: Status;
    testedAt: string | null;
    testedTo: string | null;
  } | null;
}

const EMPTY_DESIGN: EmailDesign = { version: 1, blocks: [] };

/** Sentence case, because the keys are kebab and the sidebar is not shouting. */
const TITLES: Record<string, string> = {
  "verify-email": "Verify your email",
  "email-change": "Confirm an email change",
  "password-reset": "Reset your password",
  "new-device-login": "New device signed in",
  "cashback-available": "Cashback is ready",
  "claim-rejected": "A claim was rejected",
  "account-deletion-scheduled": "Account deletion scheduled",
  "support-reply": "Support replied",
};

export function EmailTemplateStudio() {
  const { can } = useAccess();
  const { toast } = useToast();
  const templates = useResource<{ templates: TemplateRow[]; categories: string[] }>(
    "/api/admin/mail/templates",
  );
  const { mutate, pending, error, setError } = useMutation();

  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({
    name: "",
    category: "message",
    subject: "",
    preheader: "",
    replyTo: "",
    design: EMPTY_DESIGN,
  });
  const [testTo, setTestTo] = useState("");

  const canManage = can(P.marketingManage);
  const canSend = can(P.marketingSend);

  const all = templates.data?.templates ?? [];
  const categories = templates.data?.categories ?? ["message", "campaign"];

  // A system message with no override yet has no stored category, so it falls
  // back to `message` — otherwise the eight built-ins would vanish from every
  // filter until somebody saved them, which reads as them being missing.
  const categoryOf = (entry: TemplateRow) => entry.template?.category ?? "message";
  const rows = filter === "all" ? all : all.filter((entry) => categoryOf(entry) === filter);
  const existing = all.find((entry) => entry.key === selected) ?? null;

  // A key typed into "New" does not exist server-side until the first save, so
  // there is nothing in `all` to select. Synthesising the row keeps one editor
  // for both cases rather than a separate "create" screen that would drift.
  const row: TemplateRow | null =
    existing ??
    (selected
      ? { key: selected, system: false, required: [], available: all[0]?.available ?? [], starter: null, template: null }
      : null);

  const open = (entry: TemplateRow) => {
    setSelected(entry.key);
    setError(null);
    setForm({
      name: entry.template?.name ?? entry.starter?.name ?? TITLES[entry.key] ?? entry.key,
      category: entry.template?.category ?? "message",
      subject: entry.template?.subject ?? "",
      preheader: entry.template?.preheader ?? "",
      replyTo: entry.template?.replyTo ?? "",
      design: entry.template?.design ?? EMPTY_DESIGN,
    });
  };

  /** Loads the shipped wording into the editor. Nothing is saved until you save. */
  const applyStarter = (entry: TemplateRow) => {
    if (!entry.starter) return;
    setForm({
      ...form,
      name: entry.starter.name,
      subject: entry.starter.subject,
      preheader: entry.starter.preheader,
      design: entry.starter.design,
    });
    toast("Loaded. Nothing is saved until you press Save draft.", "info");
  };

  /** A template of your own — a campaign draft, or reusable copy. */
  const startBlank = () => {
    const key = window.prompt("A short name for this template, e.g. spring-promo");
    const slug = (key ?? "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
    if (!slug) return;
    setSelected(slug);
    setError(null);
    setForm({
      name: slug,
      category: filter === "all" ? "campaign" : filter,
      subject: "",
      preheader: "",
      replyTo: "",
      design: EMPTY_DESIGN,
    });
  };

  const save = async () => {
    if (!row) return;
    const saved = await mutate(`/api/admin/mail/templates/${row.key}`, {
      method: "POST",
      body: {
        name: form.name,
        category: form.category,
        subject: form.subject,
        preheader: form.preheader.trim() || undefined,
        replyTo: form.replyTo.trim() || undefined,
        design: form.design,
      },
    });
    if (!saved) return;
    toast("Saved. Send yourself a test before turning it on.", "success");
    await templates.reload();
  };

  const test = async () => {
    if (!row) return;
    const sent = await mutate(`/api/admin/mail/templates/${row.key}/test`, {
      method: "POST",
      body: { to: testTo.trim() },
    });
    if (!sent) return;
    toast(`Sent to ${testTo.trim()}. Check it looks right before turning it on.`, "success");
    await templates.reload();
  };

  const setStatus = async (status: Status) => {
    if (!row) return;
    const changed = await mutate(`/api/admin/mail/templates/${row.key}/status`, {
      method: "POST",
      body: { status },
    });
    if (!changed) return;
    toast(status === "ACTIVE" ? "Live. This wording is being sent now." : "Back to draft.", "success");
    await templates.reload();
  };

  const revert = async () => {
    if (!row) return;
    const done = await mutate(`/api/admin/mail/templates/${row.key}`, { method: "DELETE" });
    if (!done) return;
    toast("Reverted to the built-in wording.", "success");
    setSelected(null);
    await templates.reload();
  };

  if (templates.loading) return <LoadingRows rows={6} />;
  if (templates.error) return <ErrorNote>{templates.error}</ErrorNote>;

  return (
    <div className="grid flex-1 items-stretch gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <Panel className="flex min-h-0 flex-col">
        <PanelHeader
          title="Templates"
          description="System messages and anything you write"
          actions={
            <button
              type="button"
              onClick={startBlank}
              disabled={!canManage}
              className="cursor-pointer rounded-[9px] border border-hair px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-muted transition hover:text-fg disabled:opacity-50"
            >
              New +
            </button>
          }
        />

        {/* Filter, not tabs. The categories are user-typed and open-ended, so a
            tab strip would grow until it wrapped; a row of chips degrades
            gracefully and "All" is always the way back. */}
        <div className="flex flex-wrap gap-1.5 border-b border-hair px-3.5 pb-3">
          {["all", ...categories].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className="cursor-pointer rounded-[7px] px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] transition"
              style={{
                background:
                  filter === value ? "color-mix(in oklab, var(--club) 14%, transparent)" : "transparent",
                color: filter === value ? "var(--club)" : "var(--muted)",
              }}
            >
              {value}
            </button>
          ))}
        </div>

        <RecordList className="min-h-0 flex-1 overflow-y-auto">
          {rows.map((entry) => (
            <RecordButton
              key={entry.key}
              active={entry.key === selected}
              onClick={() => open(entry)}
            >
              <span className="flex w-full items-center gap-2.5">
                <span className="flex-1 truncate text-left">
                  {TITLES[entry.key] ?? entry.key}
                </span>
                {entry.template?.status === "ACTIVE" ? (
                  <Badge tone="success">Live</Badge>
                ) : entry.template ? (
                  <Badge tone="warning">Draft</Badge>
                ) : (
                  <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                    Built-in
                  </span>
                )}
              </span>
            </RecordButton>
          ))}
        </RecordList>
      </Panel>

      {!row ? (
        <Panel className="flex flex-1 items-center justify-center p-10 text-center">
          <p className="max-w-[42ch] text-[13px] leading-[1.7] text-muted">
            Pick a message to rewrite it. Until you turn one on, every message uses its
            built-in wording — so nothing here can stop an email being sent.
          </p>
        </Panel>
      ) : (
        <Panel>
          <PanelHeader
            title={TITLES[row.key] ?? row.key}
            description={
              row.required.length > 0
                ? `Must include ${row.required.map((tag) => `{{${tag}}}`).join(", ")}`
                : "No required variables"
            }
          />

          <div className="grid gap-4 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="tpl-subject">SUBJECT</FieldLabel>
                <TextInput
                  id="tpl-subject"
                  disabled={!canManage}
                  value={form.subject}
                  placeholder="Reset your password"
                  onChange={(event) => setForm({ ...form, subject: event.target.value })}
                />
              </div>
              <div>
                <FieldLabel htmlFor="tpl-preheader">PREVIEW TEXT</FieldLabel>
                <TextInput
                  id="tpl-preheader"
                  disabled={!canManage}
                  value={form.preheader}
                  placeholder="The grey line shown after the subject"
                  onChange={(event) => setForm({ ...form, preheader: event.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="tpl-category">CATEGORY</FieldLabel>
                {/* A datalist rather than a select: the suggestions are there
                    without closing the door on a new grouping, and adding one
                    is typing rather than a schema change. */}
                <TextInput
                  id="tpl-category"
                  list="tpl-categories"
                  disabled={!canManage}
                  value={form.category}
                  placeholder="message"
                  onChange={(event) => setForm({ ...form, category: event.target.value })}
                />
                <datalist id="tpl-categories">
                  {categories.map((value) => (
                    <option key={value} value={value} />
                  ))}
                </datalist>
              </div>
              <div>
                <FieldLabel htmlFor="tpl-replyto">REPLY-TO</FieldLabel>
                <TextInput
                  id="tpl-replyto"
                  disabled={!canManage}
                  value={form.replyTo}
                  placeholder="Leave blank to use the default"
                  onChange={(event) => setForm({ ...form, replyTo: event.target.value })}
                />
              </div>
            </div>

            {/*
              The variables, listed rather than hidden in documentation. Typing
              `{{url}}` is the one thing somebody has to know, so it is on the
              screen at the moment they need it — and the required ones are
              marked, because leaving one out is the mistake that produces an
              email that sends successfully and does nothing.
            */}
            <div className="rounded-[11px] border border-hair p-3.5">
              <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-muted">
                Variables you can use
              </p>
              <div className="flex flex-wrap gap-1.5">
                {row.available.map((tag) => (
                  <Badge key={tag} tone={row.required.includes(tag) ? "primary" : "neutral"}>
                    {`{{${tag}}}`}
                    {row.required.includes(tag) ? " · required" : ""}
                  </Badge>
                ))}
              </div>
            </div>

            {row.starter && (
              <button
                type="button"
                disabled={!canManage}
                onClick={() => applyStarter(row)}
                className="cursor-pointer rounded-[11px] border border-dashed px-4 py-3 text-left transition hover:brightness-110 disabled:opacity-50"
                style={{
                  background: "color-mix(in oklab, var(--club) 5%, var(--surface-2))",
                  borderColor: "color-mix(in oklab, var(--club) 30%, var(--hair))",
                }}
              >
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-club">
                  Start from the written version
                </span>
                <span className="mt-1 block text-[12px] leading-[1.55] text-muted">
                  Loads the wording this message already sends, with every required variable
                  in place. Edit from there rather than from a blank page.
                </span>
              </button>
            )}

            <BlockComposer
              design={form.design}
              disabled={!canManage}
              onChange={(design) => setForm({ ...form, design })}
            />

            {error && <ErrorNote>{error}</ErrorNote>}

            {/*
              Write it, prove it, turn it on — in that order, and the order is
              enforced by the API rather than only suggested here. Editing
              clears the test, so "Live" always refers to wording somebody
              actually received.
            */}
            <div className="flex flex-wrap items-center gap-2.5 border-t border-hair pt-4">
              <Button onClick={save} disabled={!canManage || pending}>
                Save draft
              </Button>

              <div className="flex items-center gap-2">
                <TextInput
                  aria-label="Send a test to"
                  disabled={!canSend || pending || !row.template}
                  value={testTo}
                  placeholder="you@example.com"
                  className="w-[210px]"
                  onChange={(event) => setTestTo(event.target.value)}
                />
                <Button
                  variant="outline"
                  onClick={test}
                  disabled={!canSend || pending || !row.template || !testTo.trim()}
                >
                  Send test
                </Button>
              </div>

              {row.template?.status === "ACTIVE" ? (
                <Button variant="outline" onClick={() => setStatus("DRAFT")} disabled={!canManage || pending}>
                  Stop using this
                </Button>
              ) : (
                <Button
                  onClick={() => setStatus("ACTIVE")}
                  disabled={!canManage || pending || !row.template?.testedAt}
                  title={
                    row.template?.testedAt
                      ? undefined
                      : "Send yourself a test first - that is what proves this renders and the provider accepts it."
                  }
                >
                  Turn on
                </Button>
              )}

              {row.template && (
                <Button variant="ghost" onClick={revert} disabled={!canManage || pending}>
                  Revert to built-in
                </Button>
              )}
            </div>

            <p className="text-[11.5px] leading-[1.6] text-muted">
              {row.template?.testedAt
                ? `Tested to ${row.template.testedTo} on ${new Date(row.template.testedAt).toLocaleString()}. Editing anything clears this.`
                : "Not tested yet. Saving always clears the last test, so the proof matches the wording actually stored."}
            </p>
          </div>
        </Panel>
      )}
    </div>
  );
}
