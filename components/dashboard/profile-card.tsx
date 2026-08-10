"use client";

import Link from "next/link";
import { useId, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { useToast } from "@/components/shell/toast";
import { SecuritySection } from "@/components/dashboard/security-card";
import { apiErrorMessage } from "@/lib/auth-types";

/**
 * Matched to the API's own cap on a profile photo.
 *
 * Checked here as well as there so somebody who picks a 6MB photo is told
 * immediately instead of after uploading it — the server remains the one that
 * decides, since nothing in the browser can be trusted to enforce it.
 */
const PHOTO_MAX_BYTES = 500 * 1024;

const PHOTO_TYPES = "image/png,image/jpeg,image/webp,image/gif";

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
  const [nameBusy, setNameBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  /**
   * The URL that failed to load, not a boolean.
   *
   * A flag would have to be cleared whenever the photo changes, and clearing
   * state from an effect is exactly the pattern the compiler rules forbid.
   * Holding the URL means a newly uploaded photo is simply not the failed one.
   */
  const [photoFailed, setPhotoFailed] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const nameId = useId();
  const emailId = useId();
  const newEmailId = useId();
  const passwordId = useId();

  const accountEmail = user?.email ?? "";
  const avatarUrl = user?.avatarUrl ?? null;
  const referralCode = user?.referralCode ?? "";
  const pending = user?.pendingEmailChange;
  const displayName = name ?? user?.displayName ?? "";

  /** Only offered once the name actually differs from what is saved. */
  const nameChanged = displayName.trim().length > 0 && displayName.trim() !== user?.displayName;

  const saveName = async () => {
    setNameBusy(true);
    try {
      const response = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName: displayName.trim() }),
      });
      const body: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        toast(apiErrorMessage(body, "Could not save your name."), "warning");
        return;
      }

      // Drop the local override so the field reads from the session again —
      // otherwise it would keep showing the typed value even after a refresh
      // returned something different.
      setName(null);
      await refresh();
      toast("Name updated");
    } catch {
      toast("The account service is unavailable. Please try again.", "warning");
    } finally {
      setNameBusy(false);
    }
  };

  const uploadPhoto = async (file: File) => {
    if (file.size > PHOTO_MAX_BYTES) {
      toast(`That image is ${Math.round(file.size / 1024)}KB — the limit is 500KB.`, "warning");
      return;
    }

    setPhotoBusy(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/auth/me/photo", { method: "POST", body });
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        toast(apiErrorMessage(payload, "Could not upload that photo."), "warning");
        return;
      }

      await refresh();
      toast("Photo updated");
    } catch {
      toast("The account service is unavailable. Please try again.", "warning");
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = async () => {
    setPhotoBusy(true);
    try {
      const response = await fetch("/api/auth/me/photo", { method: "DELETE" });
      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);
        toast(apiErrorMessage(payload, "Could not remove that photo."), "warning");
        return;
      }

      await refresh();
      toast("Photo removed");
    } catch {
      toast("The account service is unavailable. Please try again.", "warning");
    } finally {
      setPhotoBusy(false);
    }
  };

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
        {/* The photo replaces the monogram in the same 56px square rather than
            sitting beside it, so the layout does not shift when one loads.
            `onError` falls back to initials: a Google avatar copied at sign-in
            lives on a CDN we do not control and can stop resolving. */}
        <button
          type="button"
          disabled={photoBusy}
          onClick={() => photoInput.current?.click()}
          aria-label={avatarUrl ? "Change your profile photo" : "Add a profile photo"}
          className="group relative grid size-14 flex-none cursor-pointer place-items-center overflow-hidden rounded-[16px] font-display text-[19px] font-black text-primary disabled:cursor-wait"
          style={{ background: "color-mix(in oklab, var(--primary) 18%, var(--surface-2))" }}
        >
          {avatarUrl && photoFailed !== avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="size-full object-cover"
              onError={() => setPhotoFailed(avatarUrl)}
            />
          ) : (
            <span>{initials(displayName) || "?"}</span>
          )}
          <span className="absolute inset-0 grid place-items-center bg-[color-mix(in_oklab,var(--surface)_72%,transparent)] font-mono text-[8px] tracking-[0.12em] text-primary opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
            {photoBusy ? "…" : "EDIT"}
          </span>
        </button>

        <input
          ref={photoInput}
          type="file"
          accept={PHOTO_TYPES}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            // Reset first, so picking the same file after a failure still
            // fires a change event — which is exactly when you would retry.
            event.target.value = "";
            if (file) void uploadPhoto(file);
          }}
        />

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
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <button
              type="button"
              disabled={photoBusy}
              onClick={() => photoInput.current?.click()}
              className="cursor-pointer font-mono text-[9px] tracking-[0.14em] text-primary disabled:cursor-wait disabled:opacity-50"
            >
              {photoBusy ? "WORKING…" : avatarUrl ? "CHANGE PHOTO" : "ADD PHOTO"}
            </button>
            {avatarUrl && (
              <button
                type="button"
                disabled={photoBusy}
                onClick={() => void removePhoto()}
                className="cursor-pointer font-mono text-[9px] tracking-[0.14em] text-muted transition hover:text-danger disabled:cursor-wait disabled:opacity-50"
              >
                REMOVE
              </button>
            )}
            <span className="font-mono text-[9px] tracking-[0.1em] text-muted">
              JPG, PNG, WEBP · MAX 500KB
            </span>
          </div>
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
          <div className="flex gap-2">
            <input
              id={nameId}
              value={displayName}
              maxLength={80}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && nameChanged && !nameBusy) void saveName();
              }}
              className="min-w-0 flex-1 rounded-[10px] border border-hair bg-surface-2 px-3.5 py-3 text-sm outline-none focus:border-primary"
            />
          </div>
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

      {/* The only save in this grid, and it does the work. It used to sit
          beside a second inline Save while itself only firing a toast — so the
          obvious button was the one that saved nothing. Disabled rather than
          hidden: a button that vanishes reads as a bug when you are looking
          for it. */}
      <button
        type="button"
        onClick={() => void saveName()}
        disabled={!nameChanged || nameBusy}
        className="mt-5 cursor-pointer rounded-[10px] bg-primary px-[22px] py-3 font-mono text-[11px] tracking-[0.14em] text-on-primary transition hover:brightness-[1.06] disabled:cursor-not-allowed disabled:opacity-45"
      >
        {nameBusy ? "SAVING…" : "SAVE CHANGES"}
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
