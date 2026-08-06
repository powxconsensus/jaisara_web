"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { FieldLabel, TextInput } from "@/components/ui/field";
import { apiErrorMessage } from "@/lib/auth-types";
import { PasswordRequirements } from "@/components/auth/password-requirements";
import { isStrongPassword, passwordPolicyMessage } from "@/lib/password-policy";

export function ResetPasswordCard({ token }: { token?: string }) {
  const passwordId = useId();
  const confirmId = useId();
  const passwordRequirementsId = useId();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(token ? null : "This reset link is incomplete.");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    if (!isStrongPassword(password)) {
      setError(passwordPolicyMessage(password) ?? "Choose a stronger password.");
      return;
    }
    if (password !== confirm) {
      setError("The passwords do not match.");
      return;
    }

    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(apiErrorMessage(body, "That reset link is invalid or expired."));
        return;
      }
      setComplete(true);
    } catch {
      setError("The authentication service is unavailable. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="w-full max-w-[420px] rounded-[18px] border border-hair bg-surface p-7 shadow-card">
      <p className="font-mono text-[9.5px] tracking-[0.2em] text-info">PASSWORD RESET</p>
      <h1 className="mt-3 font-display text-[27px] font-black uppercase leading-none">
        {complete ? "Password updated" : "Choose a new password"}
      </h1>

      {complete ? (
        <>
          <p className="mt-3 text-sm leading-[1.65] text-muted">
            Your old sessions were closed. Sign in again with your new password.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex rounded-[10px] bg-primary px-5 py-3 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-on-primary"
          >
            Go to login
          </Link>
        </>
      ) : (
        <form onSubmit={submit} className="mt-6 flex flex-col gap-3.5">
          <div>
            <FieldLabel htmlFor={passwordId}>NEW PASSWORD</FieldLabel>
            <TextInput
              id={passwordId}
              type="password"
              autoComplete="new-password"
              aria-describedby={passwordRequirementsId}
              minLength={10}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 10 characters"
            />
            <PasswordRequirements password={password} id={passwordRequirementsId} />
          </div>
          <div>
            <FieldLabel htmlFor={confirmId}>CONFIRM PASSWORD</FieldLabel>
            <TextInput
              id={confirmId}
              type="password"
              autoComplete="new-password"
              minLength={10}
              required
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
          </div>
          {error && <p role="alert" className="text-[12.5px] leading-[1.5] text-danger">{error}</p>}
          <button
            type="submit"
            disabled={pending || !token || !isStrongPassword(password)}
            className="rounded-[10px] bg-primary px-5 py-3.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-on-primary disabled:opacity-50"
          >
            {pending ? "Updating…" : "Update password"}
          </button>
        </form>
      )}
    </div>
  );
}
