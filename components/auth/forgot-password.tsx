"use client";

import { useId, useState } from "react";
import { apiErrorMessage } from "@/lib/auth-types";

/**
 * Resetting a password, on its own screen.
 *
 * It used to be a link that fired a request from underneath the sign-in form —
 * the page did not change, so the only feedback was a toast, and the email
 * field it read from was the one still sitting above a lit "Log in" button.
 * Somebody who had just admitted they cannot log in was left looking at the
 * form that does not work for them.
 *
 * So it takes over. One field, one action, and a plain way back. The
 * confirmation deliberately does not say whether the address exists: that
 * would turn this box into a way to find out who has an account here.
 */
export function ForgotPassword({
  initialEmail,
  onBack,
}: {
  initialEmail: string;
  onBack: () => void;
}) {
  const emailId = useId();
  const [email, setEmail] = useState(initialEmail);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        setError(apiErrorMessage(body, "Could not send a reset link."));
        return;
      }
      setSent(true);
    } catch {
      setError("The authentication service is unavailable. Please try again.");
    } finally {
      setPending(false);
    }
  };

  if (sent) {
    return (
      <div
        className="w-full max-w-[420px] [animation:jsUp_.5s_cubic-bezier(.2,.8,.2,1)_both]"
        role="status"
        aria-live="polite"
      >
        <div className="overflow-hidden rounded-[18px] border border-hair bg-surface">
          <div className="px-[26px] pb-5 pt-[26px]">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-info">
              [ Check your inbox ]
            </p>
            <h1 className="mt-3 font-display text-[27px] font-black uppercase leading-none tracking-[-0.02em]">
              Link sent.
            </h1>
          </div>

          <div
            aria-hidden
            className="h-[9px] w-full"
            style={{
              background:
                "radial-gradient(circle at 5px 4px, var(--bg) 4px, transparent 4.5px) 0 0/14px 9px repeat-x",
            }}
          />

          <div className="px-[26px] pb-[26px] pt-5">
            {/* Never "we found your account" — that answers a question an
                attacker is asking, not one the member is. */}
            <p className="text-[13px] leading-[1.7] text-muted">
              If there is a Jaisara account for
            </p>
            <p className="mt-1.5 break-all font-mono text-[14.5px] tracking-[-0.01em] text-primary">
              {email}
            </p>
            <p className="mt-1.5 text-[13px] leading-[1.7] text-muted">
              a reset link is on its way. It works once and expires in an hour.
            </p>

            <div className="mt-6 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => setSent(false)}
                className="cursor-pointer rounded-[10px] border border-hair px-5 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition hover:border-primary hover:text-fg"
              >
                Use a different address
              </button>
              <button
                type="button"
                onClick={onBack}
                className="cursor-pointer rounded-[10px] border border-hair px-5 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition hover:border-primary hover:text-fg"
              >
                Back to log in
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[420px] [animation:jsUp_.5s_cubic-bezier(.2,.8,.2,1)_both]">
      <p className="mb-3.5 font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
        Account // recovery
      </p>
      <h1 className="mb-2 font-display text-[28px] font-black uppercase leading-none tracking-[-0.02em]">
        Reset your password
      </h1>
      <p className="mb-[26px] text-sm text-muted">
        Tell us the address on your account and we&rsquo;ll send a link to set a new password.
      </p>

      <form onSubmit={(event) => void submit(event)} className="grid gap-3.5">
        <div>
          <label
            htmlFor={emailId}
            className="mb-[7px] block font-mono text-[9px] tracking-[0.14em] text-muted"
          >
            EMAIL
          </label>
          <input
            id={emailId}
            type="email"
            autoComplete="email"
            required
            autoFocus
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@email.com"
            className="w-full rounded-[11px] border border-hair bg-surface-2 px-3.5 py-3.5 text-sm outline-none transition focus:border-primary"
          />
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-[10px] border px-3.5 py-2.5 text-[12.5px] leading-[1.5] text-danger"
            style={{ borderColor: "color-mix(in oklab, var(--danger) 42%, var(--hair))" }}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || !email}
          className="mt-1 flex cursor-pointer items-center justify-center gap-2.5 rounded-[11px] bg-primary p-[15px] font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] text-on-primary transition duration-[250ms] hover:-translate-y-0.5 hover:brightness-[1.08] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send reset link"}
          <span className="text-[13px]">↗</span>
        </button>

        <button
          type="button"
          onClick={onBack}
          className="cursor-pointer text-center font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition hover:text-fg"
        >
          ← Back to log in
        </button>
      </form>
    </div>
  );
}
