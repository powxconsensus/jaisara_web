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

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) setNote("");
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[190] bg-black/55 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[200] w-[min(520px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-modal border border-hair bg-surface p-[clamp(20px,3vw,30px)] shadow-card">
          <Dialog.Title className="font-display text-[22px] font-black uppercase leading-none">
            {title}
          </Dialog.Title>

          <Dialog.Description asChild>
            <div className="mt-4 text-[12.5px] leading-6 text-muted">{summary}</div>
          </Dialog.Description>

          {reason && (
            <div className="mt-5">
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
                className="min-h-[90px] text-[13px] leading-6"
              />
              <p className="mt-2 text-[11px] text-muted">
                {noteTooShort
                  ? `At least ${minLength} characters. ${reason.help ?? "The member is shown this."}`
                  : (reason.help ?? "The member is shown this.")}
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4">
              <ErrorNote>{error}</ErrorNote>
            </div>
          )}

          <div className="mt-6 flex flex-wrap justify-end gap-2">
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
              className={cn(
                intent === "danger" &&
                  "bg-danger text-white hover:brightness-110",
              )}
            >
              {pending ? "Working…" : confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
