"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { FieldLabel, TextInput } from "@/components/ui/field";
import { useToast } from "@/components/shell/toast";
import { useAuth } from "@/components/auth/auth-context";
import { apiErrorMessage } from "@/lib/auth-types";
import { PasswordRequirements } from "@/components/auth/password-requirements";
import { isStrongPassword, passwordPolicyMessage } from "@/lib/password-policy";

export function SecurityCard() {
  const { toast } = useToast();
  const router = useRouter();
  const { signOut, user } = useAuth();
  const hasPassword = user?.hasPassword !== false;
  const currentId = useId();
  const nextId = useId();
  const confirmId = useId();
  const passwordRequirementsId = useId();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(apiErrorMessage(body, "Your password could not be changed."));
        return;
      }

      toast("Password changed. Sign in again.", "success");
      router.push("/login");
      router.refresh();
    } catch {
      setError("The authentication service is unavailable. Please try again.");
    } finally {
      setPending(false);
    }
  };

  const logout = async () => {
    setPending(true);
    await signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <section className="mb-4 rounded-[18px] border border-hair bg-surface p-[clamp(20px,3vw,26px)]">
      <h2 className="mb-2 font-mono text-[9.5px] tracking-[0.22em] text-muted">SECURITY</h2>
      <p className="mb-5 text-[12.5px] leading-[1.6] text-muted">
        Changing your password closes every active session, including this one.
      </p>

      <form onSubmit={changePassword} className="grid gap-3.5 md:grid-cols-2">
        {hasPassword && (
          <div className="md:col-span-2">
            <FieldLabel htmlFor={currentId}>CURRENT PASSWORD</FieldLabel>
            <TextInput
              id={currentId}
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </div>
        )}
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
          />
        </div>

        {error && (
          <p role="alert" className="text-[12.5px] leading-[1.5] text-danger md:col-span-2">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2.5 md:col-span-2">
          <button
            type="submit"
            disabled={pending || !isStrongPassword(newPassword)}
            className="cursor-pointer rounded-[10px] bg-primary px-[22px] py-3 font-mono text-[11px] tracking-[0.14em] text-on-primary disabled:opacity-50"
          >
            {pending ? "PLEASE WAIT…" : hasPassword ? "CHANGE PASSWORD" : "SET PASSWORD"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => void logout()}
            className="cursor-pointer rounded-[10px] border border-hair px-[22px] py-3 font-mono text-[11px] tracking-[0.14em] text-muted disabled:opacity-50"
          >
            SIGN OUT
          </button>
        </div>
      </form>
    </section>
  );
}
