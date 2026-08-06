"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-context";
import { useToast } from "@/components/shell/toast";
import { FieldLabel, TextInput } from "@/components/ui/field";
import { apiErrorMessage } from "@/lib/auth-types";

export function DeleteAccountCard() {
  const router = useRouter();
  const { signOut, user } = useAuth();
  const { toast } = useToast();
  const emailId = useId();
  const passwordId = useId();
  const [open, setOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasPassword = user?.hasPassword !== false;
  const emailMatches =
    Boolean(user?.email) &&
    confirmEmail.trim().toLowerCase() === user?.email.trim().toLowerCase();

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open, pending]);

  const close = () => {
    if (pending) return;
    setOpen(false);
    setConfirmEmail("");
    setCurrentPassword("");
    setError(null);
  };

  const requestDeletion = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!emailMatches) {
      setError("Enter the email address on this account exactly.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          confirmEmail,
          currentPassword: hasPassword ? currentPassword : undefined,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(apiErrorMessage(body, "Your account could not be scheduled for deletion."));
        return;
      }

      await signOut();
      toast("Account deletion scheduled for 30 days from now.", "info");
      router.replace("/login");
      router.refresh();
    } catch {
      setError("The authentication service is unavailable. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <section
        className="mb-4 rounded-[18px] border bg-surface p-[clamp(20px,3vw,26px)]"
        style={{ borderColor: "color-mix(in oklab, var(--danger) 36%, var(--hair))" }}
      >
        <h2 className="mb-2 font-mono text-[9.5px] tracking-[0.22em] text-danger">
          DANGER ZONE
        </h2>
        <p className="max-w-[650px] text-[12.5px] leading-[1.65] text-muted">
          Schedule your account for deletion. You will be signed out immediately, but
          signing in again within 30 days cancels the request automatically.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-5 cursor-pointer rounded-[10px] border border-danger px-[18px] py-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-danger transition hover:bg-danger hover:text-white"
        >
          Delete account
        </button>
      </section>

      {open && (
        <div
          className="fixed inset-0 z-[120] grid place-items-center bg-black/65 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            className="w-full max-w-[480px] rounded-[20px] border border-danger bg-surface p-[clamp(22px,4vw,32px)] shadow-card"
          >
            <p className="font-mono text-[9.5px] tracking-[0.2em] text-danger">
              FINAL CONFIRMATION
            </p>
            <h2
              id="delete-account-title"
              className="mt-3 font-display text-[26px] font-black uppercase leading-none"
            >
              Delete your account?
            </h2>
            <p className="mt-3 text-[13px] leading-[1.65] text-muted">
              Access is disabled now. After 30 days, your account and personal
              information are permanently removed. Financial ledger records are retained
              only in anonymized form.
            </p>

            <form onSubmit={requestDeletion} className="mt-6 grid gap-4">
              <div>
                <FieldLabel htmlFor={emailId}>
                  TYPE {user?.email?.toUpperCase() ?? "YOUR EMAIL"} TO CONFIRM
                </FieldLabel>
                <TextInput
                  id={emailId}
                  type="email"
                  autoComplete="email"
                  autoFocus
                  required
                  value={confirmEmail}
                  onChange={(event) => setConfirmEmail(event.target.value)}
                  disabled={pending}
                />
              </div>

              {hasPassword && (
                <div>
                  <FieldLabel htmlFor={passwordId}>CURRENT PASSWORD</FieldLabel>
                  <TextInput
                    id={passwordId}
                    type="password"
                    autoComplete="current-password"
                    required
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    disabled={pending}
                  />
                </div>
              )}

              {error && (
                <p role="alert" className="text-[12.5px] leading-[1.5] text-danger">
                  {error}
                </p>
              )}

              <div className="mt-1 flex flex-wrap justify-end gap-2.5">
                <button
                  type="button"
                  onClick={close}
                  disabled={pending}
                  className="cursor-pointer rounded-[10px] border border-hair px-[18px] py-3 font-mono text-[10px] tracking-[0.12em] text-muted disabled:opacity-50"
                >
                  KEEP MY ACCOUNT
                </button>
                <button
                  type="submit"
                  disabled={
                    pending || !emailMatches || (hasPassword && !currentPassword)
                  }
                  className="cursor-pointer rounded-[10px] bg-danger px-[18px] py-3 font-mono text-[10px] tracking-[0.12em] text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {pending ? "SCHEDULING…" : "CONFIRM DELETION"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
