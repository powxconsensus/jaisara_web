"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { FieldLabel, TextInput } from "@/components/ui/field";
import { useToast } from "@/components/shell/toast";
import { useAuth } from "@/components/auth/auth-context";
import { apiErrorMessage } from "@/lib/auth-types";
import { apiFetch } from "@/lib/api-fetch";
import { PasswordRequirements } from "@/components/auth/password-requirements";
import { isStrongPassword, passwordPolicyMessage } from "@/lib/password-policy";

/**
 * Password management.
 *
 * Rendered *inside* the profile card, directly under "change your sign-in
 * email". Both are the same kind of thing - a credential change that needs the
 * current password - and splitting them across two cards made one account
 * concern look like two features. Same disclosure shape as the email block, so
 * the page is not a wall of permanently-open password fields.
 *
 * Signing out is deliberately not here. It used to sit beside "Change
 * password", where a routine action was one mis-click from a destructive-
 * looking form; it now lives as an icon at the top of the profile card.
 */
export function SecuritySection() {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const hasPassword = user?.hasPassword !== false;
  const currentId = useId();
  const nextId = useId();
  const confirmId = useId();
  const passwordRequirementsId = useId();

  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkSent, setLinkSent] = useState(false);

  const close = () => {
    setOpen(false);
    setError(null);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!isStrongPassword(newPassword)) {
      setError(passwordPolicyMessage(newPassword) ?? "Choose a stronger password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }

    setPending(true);
    try {
      const response = await apiFetch("/api/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(apiErrorMessage(body, "Your password could not be changed."));
        return;
      }

      // 205 is the one case the session could not be renewed. Everything else
      // keeps this tab signed in - the change signs out other devices, not the
      // person making it.
      if (response.status === 205) {
        toast("Password changed. Please sign in again.", "info");
        router.push("/login");
        router.refresh();
        return;
      }

      close();
      toast("Password changed. Your other devices have been signed out.", "success");
      router.refresh();
    } catch {
      setError("The authentication service is unavailable. Please try again.");
    } finally {
      setPending(false);
    }
  };

  const requestPasswordLink = async () => {
    setPending(true);
    setError(null);
    try {
      const response = await apiFetch("/api/auth/set-password-link", { method: "POST" });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(apiErrorMessage(body, "The secure password link could not be sent."));
        return;
      }
      setLinkSent(true);
      toast("Secure password link sent. Check your inbox.", "success");
    } catch {
      setError("The authentication service is unavailable. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div>
      <div className="my-6 h-px bg-hair" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[9px] tracking-[0.16em] text-muted">SECURITY</p>
          <h3 className="mt-2 text-sm font-semibold">
            {hasPassword ? "Change your password" : "Set a password"}
          </h3>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted">
            {hasPassword
              ? "Changing your password closes every active session, including this one."
              : "Your account signs in with Google. To add a password, confirm ownership through a secure link sent to your email."}
          </p>
        </div>

        {hasPassword ? (
          !open && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-[10px] border border-hair px-4 py-2.5 font-mono text-[9px] tracking-[0.14em] text-primary transition hover:border-primary"
            >
              CHANGE PASSWORD
            </button>
          )
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => void requestPasswordLink()}
            className="rounded-[10px] border border-hair px-4 py-2.5 font-mono text-[9px] tracking-[0.14em] text-primary transition hover:border-primary disabled:cursor-wait disabled:opacity-60"
          >
            {pending ? "SENDING…" : linkSent ? "SEND ANOTHER LINK" : "EMAIL SECURE LINK"}
          </button>
        )}
      </div>

      {!hasPassword && linkSent && (
        <p className="mt-4 rounded-[14px] border border-success/30 bg-success/5 p-4 text-xs leading-relaxed text-success">
          Link sent to {user?.email}. It is valid for one hour.
        </p>
      )}

      {hasPassword && open && (
        <form
          onSubmit={changePassword}
          className="mt-4 rounded-[14px] border border-hair bg-surface-2 p-4"
        >
          <div className="grid gap-3.5 md:grid-cols-2">
            <div className="md:col-span-2">
              <FieldLabel htmlFor={currentId}>CURRENT PASSWORD</FieldLabel>
              <TextInput
                id={currentId}
                type="password"
                autoComplete="current-password"
                autoFocus
                required
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="bg-surface"
              />
            </div>
            <div>
              <FieldLabel htmlFor={nextId}>NEW PASSWORD</FieldLabel>
              <TextInput
                id={nextId}
                type="password"
                autoComplete="new-password"
                aria-describedby={passwordRequirementsId}
                minLength={10}
                required
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="At least 10 characters"
                className="bg-surface"
              />
              <PasswordRequirements password={newPassword} id={passwordRequirementsId} />
            </div>
            <div>
              <FieldLabel htmlFor={confirmId}>CONFIRM NEW PASSWORD</FieldLabel>
              <TextInput
                id={confirmId}
                type="password"
                autoComplete="new-password"
                minLength={10}
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="bg-surface"
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-3 text-xs leading-relaxed text-danger">
              {error}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2.5">
            <button
              type="submit"
              disabled={pending || !isStrongPassword(newPassword)}
              className="rounded-[10px] bg-primary px-5 py-3 font-mono text-[10px] tracking-[0.14em] text-on-primary transition hover:brightness-[1.06] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "PLEASE WAIT…" : "CHANGE PASSWORD"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={close}
              className="rounded-[10px] border border-hair px-5 py-3 font-mono text-[10px] tracking-[0.14em] text-muted"
            >
              CANCEL
            </button>
          </div>
        </form>
      )}

      {!hasPassword && error && (
        <p role="alert" className="mt-3 text-xs leading-relaxed text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
