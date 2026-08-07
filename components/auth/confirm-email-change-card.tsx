"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { apiErrorMessage } from "@/lib/auth-types";

type ChangeStatus = "idle" | "working" | "changed" | "error";

export function ConfirmEmailChangeCard({ token }: { token?: string }) {
  const started = useRef(false);
  const [status, setStatus] = useState<ChangeStatus>(token ? "working" : "idle");
  const [message, setMessage] = useState(
    token ? "Confirming your new email address…" : "Open the link sent to your new email.",
  );

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;

    void (async () => {
      try {
        const response = await fetch("/api/auth/email-change/confirm", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          setStatus("error");
          setMessage(apiErrorMessage(body, "That email-change link is invalid or expired."));
          return;
        }

        setStatus("changed");
        setMessage("Your email has been changed. Sign in again using the new address.");
      } catch {
        setStatus("error");
        setMessage("The authentication service is unavailable. Please try again.");
      }
    })();
  }, [token]);

  return (
    <div className="w-full max-w-[420px] rounded-[18px] border border-hair bg-surface p-7 shadow-card">
      <p className="font-mono text-[9.5px] tracking-[0.2em] text-info">EMAIL CHANGE</p>
      <h1 className="mt-3 font-display text-[27px] font-black uppercase leading-none">
        {status === "changed"
          ? "Email updated"
          : status === "error"
            ? "Link not accepted"
            : "Confirm new email"}
      </h1>
      <p className="mt-3 text-sm leading-[1.65] text-muted">{message}</p>

      <div className="mt-6 flex flex-wrap gap-2.5">
        {status === "changed" && (
          <Link
            href="/login"
            className="rounded-[10px] bg-primary px-5 py-3 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-on-primary"
          >
            Sign in again
          </Link>
        )}
        {status === "error" && (
          <Link
            href="/dashboard/account"
            className="rounded-[10px] bg-primary px-5 py-3 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-on-primary"
          >
            Account settings
          </Link>
        )}
        {status !== "changed" && (
          <Link
            href="/login"
            className="rounded-[10px] border border-hair px-5 py-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted"
          >
            Log in
          </Link>
        )}
      </div>
    </div>
  );
}
