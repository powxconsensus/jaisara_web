"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { useToast } from "@/components/shell/toast";
import { SecuritySection } from "@/components/dashboard/security-card";
import { apiErrorMessage } from "@/lib/auth-types";

/** Initials from the display name, for the avatar monogram. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function expiryLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "within one hour";
  return date.toLocaleString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  });
}

/** Profile settings (handoff §4.9). Independent of the appearance card. */
export function ProfileCard() {
  const { user, refresh } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState<string | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const nameId = useId();
  const emailId = useId();
  const newEmailId = useId();
  const passwordId = useId();

  const accountEmail = user?.email ?? "";
  const referralCode = user?.referralCode ?? "";
  const pending = user?.pendingEmailChange;
  const displayName = name ?? user?.displayName ?? "";

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      toast("Referral code copied");
    } catch {
      toast("Could not copy — select it manually", "warning");
    }
  };

  const requestEmailChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEmailError("");
    setEmailBusy(true);

    try {
      const response = await fetch("/api/auth/email-change", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ newEmail, currentPassword }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setEmailError(apiErrorMessage(body, "Could not start the email change."));
        return;
      }

      setNewEmail("");
      setCurrentPassword("");
      setShowEmailForm(false);
      await refresh();
      toast("Confirmation sent to your new email");
    } catch {
      setEmailError("The authentication service is unavailable. Please try again.");
    } finally {
      setEmailBusy(false);
    }
  };

  const cancelEmailChange = async () => {
    setEmailError("");
    setEmailBusy(true);

    try {
      const response = await fetch("/api/auth/email-change", { method: "DELETE" });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setEmailError(apiErrorMessage(body, "Could not cancel the email change."));
        return;
      }

      await refresh();
      toast("Email change request cancelled");
    } catch {
      setEmailError("The authentication service is unavailable. Please try again.");
    } finally {
      setEmailBusy(false);
    }
  };

  return (
    <section className="mb-4 rounded-[18px] border border-hair bg-surface p-[clamp(20px,3vw,26px)]">
      {/* Sign out is in the navbar, not here: it is a frequent action and
          making somebody open account settings to reach it is friction for
          no benefit. */}
      <h2 className="mb-5 font-mono text-[9.5px] tracking-[0.22em] text-muted">PROFILE</h2>

      <div className="mb-6 flex items-center gap-4">
        <span
          className="grid size-14 flex-none place-items-center rounded-[16px] font-display text-[19px] font-black text-primary"
          style={{ background: "color-mix(in oklab, var(--primary) 18%, var(--surface-2))" }}
        >
          {initials(displayName) || "?"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold tracking-[-0.01em]">
            {displayName || "Your name"}
          </p>
          {/* No invented join date or tier: the account's own values or
              nothing. A fixed "MEMBER SINCE MAY 2026" was wrong for everyone
              who did not sign up that month. */}
          <p className="mt-[5px] truncate font-mono text-[10px] tracking-[0.1em] text-muted">
            {accountEmail}
          </p>
        </div>
      </div>

      <div className="grid gap-3.5 md:grid-cols-2">
        <div>
          <label
            htmlFor={nameId}
            className="mb-[7px] block font-mono text-[9px] tracking-[0.14em] text-muted"
          >
            DISPLAY NAME
          </label>
          <input
            id={nameId}
            value={displayName}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-[10px] border border-hair bg-surface-2 px-3.5 py-3 text-sm outline-none focus:border-primary"
          />
        </div>

        <div>
          <label
            htmlFor={emailId}
            className="mb-[7px] block font-mono text-[9px] tracking-[0.14em] text-muted"
          >
            CURRENT EMAIL
          </label>
          <div className="relative">
            <input
              id={emailId}
              type="email"
              value={accountEmail}
              readOnly
              className="w-full rounded-[10px] border border-hair bg-surface-2 px-3.5 py-3 pr-20 text-sm text-muted outline-none"
            />
            {user?.emailVerified && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[8px] tracking-[0.12em] text-success">
                VERIFIED
              </span>
            )}
          </div>
        </div>

        <div>
          <p className="mb-[7px] font-mono text-[9px] tracking-[0.14em] text-muted">
            YOUR REFERRAL CODE
          </p>
          <button
            type="button"
            onClick={copyCode}
            className="flex w-full cursor-pointer items-center justify-between gap-2.5 rounded-[10px] border border-dashed border-hair bg-surface-2 px-3.5 py-3 transition hover:border-club"
          >
            <span className="font-mono text-[13px] tracking-[0.1em] text-club">
              {referralCode}
            </span>
            <span className="font-mono text-[9px] tracking-[0.14em] text-muted">COPY</span>
          </button>
        </div>

        <div>
          <p className="mb-[7px] font-mono text-[9px] tracking-[0.14em] text-muted">
            PAYOUT DEFAULT
          </p>
          <div className="flex items-center justify-between gap-2.5 rounded-[10px] border border-hair bg-surface-2 px-3.5 py-3">
            <span className="text-sm">USDT · TRC-20</span>
            <Link
              href="/dashboard/withdraw"
              className="font-mono text-[9px] tracking-[0.14em] text-primary"
            >
              CHANGE
            </Link>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => toast("Changes saved")}
        className="mt-5 cursor-pointer rounded-[10px] bg-primary px-[22px] py-3 font-mono text-[11px] tracking-[0.14em] text-on-primary transition hover:brightness-[1.06]"
      >
        SAVE CHANGES
      </button>

      <div className="my-6 h-px bg-hair" />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[9px] tracking-[0.16em] text-muted">EMAIL ADDRESS</p>
          <h3 className="mt-2 text-sm font-semibold">Change your sign-in email</h3>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted">
            Your current email stays active until you confirm the new address. The link is valid
            for one hour.
          </p>
        </div>
        {!pending && user?.hasPassword !== false && !showEmailForm && (
          <button
            type="button"
            onClick={() => setShowEmailForm(true)}
            className="rounded-[10px] border border-hair px-4 py-2.5 font-mono text-[9px] tracking-[0.14em] text-primary transition hover:border-primary"
          >
            CHANGE EMAIL
          </button>
        )}
      </div>

      {pending ? (
        <div
          className="mt-4 rounded-[14px] border border-info/30 bg-info/5 p-4"
          aria-live="polite"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-mono text-[9px] tracking-[0.16em] text-info">
                CONFIRMATION PENDING
              </p>
              <p className="mt-2 break-all text-sm font-semibold">{pending.email}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Confirm by {expiryLabel(pending.expiresAt)}. Until then, your sign-in email remains{" "}
                {accountEmail}.
              </p>
            </div>
            <button
              type="button"
              disabled={emailBusy}
              onClick={() => void cancelEmailChange()}
              className="rounded-[10px] border border-danger/35 px-4 py-2.5 font-mono text-[9px] tracking-[0.14em] text-danger transition hover:border-danger disabled:cursor-wait disabled:opacity-60"
            >
              {emailBusy ? "CANCELLING…" : "CANCEL REQUEST"}
            </button>
          </div>
        </div>
      ) : user?.hasPassword === false ? (
        <div className="mt-4 rounded-[14px] border border-warning/30 bg-warning/5 p-4 text-xs leading-relaxed text-muted">
          This Google account does not have a password yet. Use <strong>Set password</strong> in
          Security below, then return here to change your email.
        </div>
      ) : showEmailForm ? (
        <form
          onSubmit={(event) => void requestEmailChange(event)}
          className="mt-4 rounded-[14px] border border-hair bg-surface-2 p-4"
        >
          <div className="grid gap-3.5 md:grid-cols-2">
            <div>
              <label
                htmlFor={newEmailId}
                className="mb-[7px] block font-mono text-[9px] tracking-[0.14em] text-muted"
              >
                NEW EMAIL
              </label>
              <input
                id={newEmailId}
                type="email"
                autoComplete="email"
                required
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
                className="w-full rounded-[10px] border border-hair bg-surface px-3.5 py-3 text-sm outline-none focus:border-primary"
                placeholder="new@email.com"
              />
            </div>
            <div>
              <label
                htmlFor={passwordId}
                className="mb-[7px] block font-mono text-[9px] tracking-[0.14em] text-muted"
              >
                CURRENT PASSWORD
              </label>
              <input
                id={passwordId}
                type="password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="w-full rounded-[10px] border border-hair bg-surface px-3.5 py-3 text-sm outline-none focus:border-primary"
                placeholder="Enter your password"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2.5">
            <button
              type="submit"
              disabled={emailBusy}
              className="rounded-[10px] bg-primary px-5 py-3 font-mono text-[10px] tracking-[0.14em] text-on-primary transition hover:brightness-[1.06] disabled:cursor-wait disabled:opacity-60"
            >
              {emailBusy ? "SENDING…" : "SEND CONFIRMATION"}
            </button>
            <button
              type="button"
              disabled={emailBusy}
              onClick={() => {
                setShowEmailForm(false);
                setEmailError("");
                setCurrentPassword("");
              }}
              className="rounded-[10px] border border-hair px-5 py-3 font-mono text-[10px] tracking-[0.14em] text-muted"
            >
              CANCEL
            </button>
          </div>
        </form>
      ) : null}

      {emailError && (
        <p className="mt-3 text-xs leading-relaxed text-danger" role="alert">
          {emailError}
        </p>
      )}

      {/* Password sits in this card too: both are credential changes on the
          same account, and two cards made them read as unrelated features. */}
      <SecuritySection />
    </section>
  );
}
