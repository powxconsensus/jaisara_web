"use client";

import { useState } from "react";
import { FieldLabel, TextInput } from "@/components/ui/field";
import { Segmented, Textarea } from "@/components/console/ui";

/**
 * The message body.
 *
 * HTML and plain text used to sit side by side, each getting half the width to
 * show what is really a full-width document — so both were cramped and neither
 * was readable. They are the same message in two encodings, never edited at
 * once, so a toggle is the honest control: one editor, full width, with the
 * rendered result a click away.
 */

type Mode = "html" | "text" | "preview";

const MODES: { value: Mode; label: string }[] = [
  { value: "html", label: "HTML" },
  { value: "text", label: "Plain text" },
  { value: "preview", label: "Preview" },
];

/** Stand-ins so the preview reads like a real message rather than braces. */
const SAMPLE: Record<string, string> = {
  "{{firstName}}": "Sara",
  "{{unsubscribeUrl}}": "#unsubscribe-preview",
  "{{email}}": "sara@example.com",
};

export function CampaignEditor({
  html,
  text,
  disabled,
  onChange,
}: {
  html: string;
  text: string;
  disabled?: boolean;
  onChange: (next: { bodyHtml?: string; bodyText?: string }) => void;
}) {
  const [mode, setMode] = useState<Mode>("html");

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <FieldLabel htmlFor={mode === "text" ? "campaign-text" : "campaign-html"}>
          MESSAGE BODY
        </FieldLabel>
        <Segmented label="Message format" options={MODES} value={mode} onChange={setMode} />
      </div>

      {mode === "html" && (
        <Textarea
          id="campaign-html"
          required
          spellCheck={false}
          disabled={disabled}
          value={html}
          onChange={(event) => onChange({ bodyHtml: event.target.value })}
          className="min-h-[440px] font-mono text-[12.5px] leading-6"
        />
      )}

      {mode === "text" && (
        <>
          <Textarea
            id="campaign-text"
            required
            disabled={disabled}
            value={text}
            onChange={(event) => onChange({ bodyText: event.target.value })}
            className="min-h-[440px] font-mono text-[12.5px] leading-6"
          />
          <p className="mt-2 text-[11px] leading-5 text-muted">
            Sent alongside the HTML. Some clients show only this, and a missing text part is a
            spam signal in its own right — so it is required, not optional.
          </p>
        </>
      )}

      {mode === "preview" && (
        <div>
          <iframe
            title="Rendered email preview"
            // No scripts, no forms, no same-origin: the body is admin-authored,
            // but it should not be able to reach the console around it.
            sandbox=""
            srcDoc={fillSample(html)}
            className="h-[440px] w-full rounded-[11px] border border-hair bg-white"
          />
          <p className="mt-2 text-[11px] leading-5 text-muted">
            Merge fields are filled with sample values. Real recipients get their own name and a
            unique unsubscribe link.
          </p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {Object.keys(SAMPLE).map((token) => (
          <code
            key={token}
            className="rounded-md bg-surface-2 px-2 py-1 font-mono text-[10px] text-muted"
          >
            {token}
          </code>
        ))}
      </div>
    </div>
  );
}

export function SubjectFields({
  name,
  subject,
  disabled,
  onChange,
}: {
  name: string;
  subject: string;
  disabled?: boolean;
  onChange: (next: { name?: string; subject?: string }) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div>
        <FieldLabel htmlFor="campaign-name">INTERNAL NAME</FieldLabel>
        <TextInput
          id="campaign-name"
          required
          maxLength={120}
          disabled={disabled}
          placeholder="August cashback update"
          value={name}
          onChange={(event) => onChange({ name: event.target.value })}
        />
        <p className="mt-2 text-[11px] text-muted">Only ever seen in this console.</p>
      </div>
      <div>
        <FieldLabel htmlFor="campaign-subject">EMAIL SUBJECT</FieldLabel>
        <TextInput
          id="campaign-subject"
          required
          maxLength={160}
          disabled={disabled}
          placeholder="Your cashback just cleared"
          value={subject}
          onChange={(event) => onChange({ subject: event.target.value })}
        />
        <p className="mt-2 text-[11px] text-muted">{subject.length}/160 characters.</p>
      </div>
    </div>
  );
}

function fillSample(html: string): string {
  return Object.entries(SAMPLE).reduce(
    (output, [token, value]) => output.replaceAll(token, value),
    html,
  );
}
