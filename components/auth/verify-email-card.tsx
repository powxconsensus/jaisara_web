"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiErrorMessage } from "@/lib/auth-types";

type VerifyStatus = "idle" | "working" | "verified" | "error";

/**
 * The landing page for a verification link.
 *
 * Clicking the link is a formality, not a destination — the member came to use
 * their account, and being handed a page that says "Email confirmed" with a
 * button to continue is a step they did not ask for. So this shows work in
 * progress and then leaves: confirm, refresh the session, go to the dashboard.
 *
 * **Why the session has to be refreshed.** The access token carries whether the
 * email was verified, and the one in the cookie was minted before it was. Left
 * alone, the member arrives at a dashboard whose every verified-only call is
 * refused. Rotating the refresh token re-reads the account and mints a token
 * that says verified, which is what makes the redirect land somewhere usable.
 *
 * Somebody who opened the link in a different browser has no session to
 * refresh; they are sent to sign in, which is the only thing that can help.
 */
export function VerifyEmailCard({ token }: { token?: string }) {
  const router = useRouter();
  const started = useRef(false);
  const [status, setStatus] = useState<VerifyStatus>(token ? "working" : "idle");
  const [message, setMessage] = useState(
    token ? "" : "Open the link in your verification email.",
  );

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;

    void (async () => {
      try {
        const response = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const body = await response.json().catch(() => null);

        if (!response.ok) {
          setStatus("error");
          setMessage(apiErrorMessage(body, "That verification link is invalid or expired."));
          return;
        }

        setStatus("verified");

        // Swap the stale token for one that says verified. A failure here is
        // not fatal — it just means the member signs in again — so the redirect
        // happens either way rather than stranding them on a spinner.
        const session = await fetch("/api/auth/refresh-session", { method: "POST" }).catch(
          () => null,
        );

        router.replace(session?.ok ? "/dashboard" : "/login");
        router.refresh();
      } catch {
        setStatus("error");
        setMessage("The authentication service is unavailable. Please try again.");
      }
    })();
  }, [token, router]);

  const working = status === "working" || status === "verified";

  return (
    <div className="w-full max-w-[420px] rounded-[18px] border border-hair bg-surface p-7 shadow-card">
      <p className="font-mono text-[9.5px] tracking-[0.2em] text-info">EMAIL VERIFICATION</p>

      <h1 className="mt-3 font-display text-[27px] font-black uppercase leading-none">
        {status === "verified"
          ? "You're in"
          : status === "working"
            ? "Confirming…"
            : status === "error"
              ? "Link not accepted"
              : "Check your inbox"}
      </h1>

      {working ? (
        <div className="mt-4 flex items-center gap-3">
          <span
            aria-hidden
            className="size-[15px] flex-none rounded-full border-2 border-hair"
            style={{
              borderTopColor: "var(--primary)",
              animation: "jsSpin .7s linear infinite",
            }}
          />
          <p className="text-sm leading-[1.65] text-muted">
            {status === "verified" ? "Taking you to your dashboard…" : "Confirming your email…"}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm leading-[1.65] text-muted">{message}</p>
      )}

      {/* No links while it is working — the page is about to navigate, and a
          control that races the redirect is a control that sometimes loses. */}
      {!working && (
        <div className="mt-6 flex flex-wrap gap-2.5">
          {status === "error" && (
            <Link
              href="/signup"
              className="rounded-[10px] bg-primary px-5 py-3 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-on-primary"
            >
              Request a new link
            </Link>
          )}
          <Link
            href="/login"
            className="rounded-[10px] border border-hair px-5 py-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted"
          >
            Log in
          </Link>
        </div>
      )}
    </div>
  );
}
