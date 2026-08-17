"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type ConsentStatus = "accepted" | "outdated" | "declined" | "never";

export interface ConsentState {
  requiredVersion: string;
  acceptedVersion: string | null;
  acceptedAt: string | null;
  declinedAt: string | null;
  status: ConsentStatus;
}

/**
 * What each state should actually say.
 *
 * Three different situations arrive here and the old gate treated them as one.
 * Somebody being asked again because the policy changed has already agreed
 * once, and "please accept our privacy policy" reads to them like a bug.
 * Somebody who declined made a decision, and pretending it never happened is
 * how a prompt becomes nagging rather than a question.
 */
const COPY: Record<Exclude<ConsentStatus, "accepted">, { eyebrow: string; title: string; body: string }> = {
  never: {
    eyebrow: "PRIVACY // CONSENT",
    title: "One thing before you start",
    body: "Jaisara pays cashback, so we hold your claims, your balance and your payout details. Here is what that means in practice - and what we never do with it.",
  },
  outdated: {
    eyebrow: "PRIVACY // UPDATED",
    title: "We've updated our privacy policy",
    body: "You accepted an earlier version. The wording has changed materially, so we need your agreement again before you carry on claiming or withdrawing.",
  },
  declined: {
    eyebrow: "PRIVACY // DECLINED",
    title: "You declined the privacy policy",
    body: "That is recorded, and nothing has been deleted. You can still see your account and your balance - but claims and withdrawals stay closed until you accept.",
  },
};

/** The specifics worth reading before agreeing, rather than a wall of prose. */
const POINTS = [
  "We hold your claims, balance and payout address - enough to pay you correctly, and nothing sold to anyone.",
  "Receipts you upload are read automatically and by our review team when a claim needs checking.",
  "We share the minimum with a firm to verify a purchase, and with the provider who delivers your payout.",
  "You can export or delete everything from your account page, at any time.",
];

/**
 * Blocking privacy consent, recorded against the member's account.
 *
 * The gate this replaced kept its answer in `localStorage`, which meant it was
 * not consent in any useful sense: it followed the browser rather than the
 * person, cleared with the cache, never reached the server, and left no record
 * that anybody had agreed to anything. Sign-up asked for agreement too and
 * threw it away.
 *
 * The rule is enforced by the API - `@RequirePrivacyConsent()` on every write
 * that creates value - so this dialog is how the choice is *offered*, not how
 * it is applied. Somebody who blocks the script or posts straight to the API
 * hits the same wall.
 */
export function PrivacyConsentGate({ consent }: { consent: ConsentState | null }) {
  const router = useRouter();

  // Rendered from server-resolved state, so there is no flash of a dialog for a
  // member who accepted long ago and no request on every dashboard load.
  const initial = consent && consent.status !== "accepted";
  const [open, setOpen] = useState(Boolean(initial));
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!consent || consent.status === "accepted") return null;
  const copy = COPY[consent.status];

  const submit = async (accepted: boolean) => {
    setSaving(accepted ? "accept" : "decline");
    setError(null);
    try {
      const response = await fetch("/api/legal/consent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accepted }),
      });
      if (!response.ok) {
        setError("We could not save that. Please try again.");
        setSaving(null);
        return;
      }
      setOpen(false);
      // The server-rendered layout holds the consent state, so it has to be
      // re-read for the rest of the dashboard to agree with this dialog.
      router.refresh();
    } catch {
      setError("We could not reach the server. Please try again.");
      setSaving(null);
    }
  };

  /**
   * A member who has already declined is not trapped.
   *
   * They are asked again each time they open the dashboard - that is the point
   * of recording the decline - but a dialog with no way out would be a poor
   * answer to somebody who has said no, and consent that cannot be refused is
   * not worth much as consent. Dismissing here is not persisted, so the
   * question returns on the next visit, and the writes stay closed regardless.
   */
  const dismissible = consent.status === "declined";

  return (
    <Dialog.Root open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[400] bg-[color-mix(in_oklab,var(--bg)_74%,transparent)] [backdrop-filter:blur(16px)]" />
        <Dialog.Content
          onEscapeKeyDown={(event) => {
            if (!dismissible) event.preventDefault();
            else setOpen(false);
          }}
          onPointerDownOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
          className="fixed left-1/2 top-1/2 z-[401] max-h-[calc(100dvh-40px)] w-[calc(100%-40px)] max-w-[540px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[20px] border border-hair bg-surface p-[clamp(20px,4vw,34px)] shadow-card [animation:jsUp_.45s_cubic-bezier(.2,.8,.2,1)_both]"
        >
          <div className="mb-[22px] flex items-center justify-between gap-3">
            <span className="grid size-[38px] place-items-center rounded-[11px] bg-primary font-display text-[17px] font-black text-on-primary">
              J
            </span>
            <span className="font-mono text-[9.5px] tracking-[0.22em] text-muted">{copy.eyebrow}</span>
          </div>

          <Dialog.Title className="mb-3 font-display text-[26px] font-black uppercase tracking-[-0.02em]">
            {copy.title}
          </Dialog.Title>
          <Dialog.Description className="mb-5 text-sm leading-[1.65] text-muted">
            {copy.body}
          </Dialog.Description>

          <ul className="mb-5 flex max-h-[clamp(120px,26vh,220px)] flex-col gap-3.5 overflow-y-auto rounded-[14px] border border-hair-soft bg-surface-2 p-[18px]">
            {POINTS.map((point, index) => (
              <li key={point} className="flex gap-3">
                <span className="pt-[3px] font-mono text-[10.5px] text-primary">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-[13.5px] leading-[1.6] text-muted">{point}</span>
              </li>
            ))}
          </ul>

          <label className="mb-5 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className="grid size-[21px] flex-none place-items-center rounded-md border-[1.5px] text-xs transition-all"
              style={{
                borderColor: agreed ? "var(--primary)" : "var(--hair)",
                background: agreed ? "var(--primary)" : "transparent",
                color: "var(--on-primary)",
              }}
            >
              {agreed ? "✓" : ""}
            </span>
            <span className="text-[13.5px] leading-[1.55] text-muted">
              I have read and accept the{" "}
              <Link href="/privacy" target="_blank" className="text-primary">
                Privacy policy
              </Link>{" "}
              and{" "}
              <Link href="/terms" target="_blank" className="text-primary">
                Terms &amp; conditions
              </Link>
              .
            </span>
          </label>

          {error ? (
            <p role="alert" className="mb-4 text-[13px] leading-[1.5] text-danger">
              {error}
            </p>
          ) : null}

          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => void submit(true)}
              disabled={!agreed || saving !== null}
              className="w-full cursor-pointer rounded-[11px] p-[15px] text-center font-mono text-xs font-semibold uppercase tracking-[0.16em] transition-all disabled:cursor-not-allowed"
              style={{
                background: agreed ? "var(--primary)" : "var(--surface-2)",
                color: agreed ? "var(--on-primary)" : "var(--text-muted)",
              }}
            >
              {saving === "accept" ? "Saving…" : "Accept & continue"}
            </button>

            <button
              type="button"
              onClick={() => (dismissible ? setOpen(false) : void submit(false))}
              disabled={saving !== null}
              className="w-full cursor-pointer rounded-[11px] border border-hair-soft p-[13px] text-center font-mono text-[11px] uppercase tracking-[0.16em] text-muted transition-all hover:border-hair disabled:cursor-not-allowed"
            >
              {dismissible
                ? "Continue without accepting"
                : saving === "decline"
                  ? "Saving…"
                  : "Decline"}
            </button>
          </div>

          <p className="mt-3.5 text-center font-mono text-[9.5px] leading-[1.6] tracking-[0.1em] text-muted">
            {dismissible
              ? "CLAIMS AND WITHDRAWALS STAY CLOSED UNTIL YOU ACCEPT"
              : "DECLINING KEEPS YOUR ACCOUNT — CLAIMS AND WITHDRAWALS STAY CLOSED"}
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
