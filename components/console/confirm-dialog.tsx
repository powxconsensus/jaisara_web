"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ErrorNote, Textarea } from "@/components/console/ui";
import { cn } from "@/lib/cn";

/**
 * Confirmation for the actions that cannot be taken back.
 *
 * `window.confirm` was doing this job, which is wrong for two reasons: it
 * cannot show *what* is about to happen (the amount, the address, the member),
 * and it cannot collect the reason a rejection has to carry. Both are the
 * difference between a reviewer confirming a decision and confirming a click.
 *
 * ── On the layout ──────────────────────────────────────────────────────────
 *
 * The first version had a title, a paragraph of grey text and two buttons
 * floating in the same undifferentiated box. Everything was one flat surface,
 * so nothing told you where the explanation stopped and the decision started —
 * and on a dialog that moves money, "where is the decision" is the only
 * question the layout has to answer.
 *
 * Three zones now, each on its own surface:
 *
 *   header  — an intent-coloured rule and eyebrow, then the question
 *   body    — what is about to happen, at readable contrast
 *   footer  — tinted and ruled off, so the actions read as a separate act
 *
 * The eyebrow carries the intent in words as well as colour. A red button is
 * the only warning in most consoles, which is no warning at all for anyone who
 * reads left-to-right and has already decided to click.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  intent = "primary",
  confirmLabel,
  summary,
  reason,
  pending,
  error,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  intent?: "primary" | "danger";
  confirmLabel: string;
  /** What is about to happen, in the reviewer's terms. */
  summary: ReactNode;
  /**
   * Set to collect a note. `minLength: 0` makes it optional.
   *
   * `help` matters: a rejection reason is shown to the member, an approval
   * note is not, and telling a reviewer the wrong one changes what they write.
   */
  reason?: {
    label: string;
    placeholder: string;
    minLength?: number;
    help?: string;
  };
  pending?: boolean;
  error?: string | null;
  onConfirm: (reason: string) => void | Promise<void>;
}) {
  const [note, setNote] = useState("");
  const minLength = reason?.minLength ?? 3;
  const noteTooShort = Boolean(reason) && note.trim().length < minLength;
  const danger = intent === "danger";
  const accent = danger ? "var(--danger)" : "var(--club)";

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) setNote("");
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[190] bg-black/60 backdrop-blur-[3px] [animation:jsFade_.18s_both]" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[200] w-[min(540px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-modal border bg-surface shadow-card [animation:jsPop_.2s_both]"
          style={{ borderColor: `color-mix(in oklab, ${accent} 26%, var(--hair))` }}
        >
          {/* A hairline of intent across the top. Cheaper than a coloured
              header and it survives the theme being light or dark. */}
          <div className="h-[3px] w-full" style={{ background: accent }} />

          <div className="px-[var(--ct-pad)] pb-5 pt-[18px]">
            <p
              className="mb-2.5 font-mono text-[9px] uppercase tracking-[0.22em]"
              style={{ color: accent }}
            >
              {danger ? "This cannot be undone" : "Confirm"}
            </p>

            <Dialog.Title className="font-display text-[19px] font-black uppercase leading-[1.15] tracking-[-0.01em]">
              {title}
            </Dialog.Title>

            <Dialog.Description asChild>
              {/* Not `text-muted`. This paragraph is the evidence somebody is
                  deciding on — the amount, the address, the member — and
                  greying it out is telling them it does not matter. */}
              <div className="mt-3 text-[13px] leading-[1.65] text-fg/80">{summary}</div>
            </Dialog.Description>

            {reason && (
              <div className="mt-4">
                <label
                  htmlFor="confirm-reason"
                  className="mb-2 block font-mono text-[9.5px] tracking-[0.16em] text-muted"
                >
                  {reason.label}
                </label>
                <Textarea
                  id="confirm-reason"
                  required
                  autoFocus
                  rows={3}
                  maxLength={300}
                  placeholder={reason.placeholder}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className="min-h-[92px] text-[13px] leading-6"
                />
                <div className="mt-2 flex items-baseline justify-between gap-3">
                  <p className="text-[11px] leading-[1.5] text-muted">
                    {noteTooShort
                      ? `At least ${minLength} characters. ${reason.help ?? "The member is shown this."}`
                      : (reason.help ?? "The member is shown this.")}
                  </p>
                  {/* A counter, because the limit is 300 and finding out by
                      being truncated is a bad way to find out. */}
                  <span className="flex-none font-mono text-[9.5px] tabular-nums text-muted">
                    {note.trim().length}/300
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4">
                <ErrorNote>{error}</ErrorNote>
              </div>
            )}
          </div>

          {/* The decision, on its own surface. */}
          <div
            className="flex flex-wrap items-center justify-end gap-2 border-t border-hair px-[var(--ct-pad)] py-4"
            style={{ background: "color-mix(in oklab, var(--bg) 55%, transparent)" }}
          >
            <Dialog.Close asChild>
              <Button variant="outline" size="lg" type="button">
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              type="button"
              size="lg"
              disabled={pending || noteTooShort}
              onClick={() => void onConfirm(note.trim())}
              className={cn(danger && "bg-danger text-white hover:brightness-110")}
            >
              {pending ? "Working…" : confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
