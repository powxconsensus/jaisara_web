"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { apiErrorMessage } from "@/lib/auth-types";

type CallbackStatus = "working" | "success" | "error";

export function GoogleCallback() {
  const started = useRef(false);
  const [status, setStatus] = useState<CallbackStatus>("working");
  const [message, setMessage] = useState("Finishing your Google sign-in…");

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const params = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const expiresIn = params.get("expires_in");
    const refreshExpiresIn = params.get("refresh_expires_in");

    // Remove credentials from browser history before making another request.
    window.history.replaceState(null, "", window.location.pathname);

    if (!accessToken || !refreshToken || !expiresIn || !refreshExpiresIn) {
      queueMicrotask(() => {
        setStatus("error");
        setMessage("Google did not return a complete sign-in response.");
      });
      return;
    }

    void (async () => {
      try {
        const response = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ accessToken, refreshToken, expiresIn, refreshExpiresIn }),
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          setStatus("error");
          setMessage(apiErrorMessage(body, "Google sign-in could not be completed."));
          return;
        }
        setStatus("success");
        setMessage("Google verified. Opening your dashboard now.");
        window.setTimeout(() => window.location.replace("/dashboard"), 650);
      } catch {
        setStatus("error");
        setMessage("The authentication service is unavailable. Please try again.");
      }
    })();
  }, []);

  return (
    <div className="relative w-full max-w-[420px] overflow-hidden rounded-[20px] border border-hair bg-surface p-8 text-center shadow-card">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-primary opacity-[0.14] blur-[70px]"
      />
      <div
        className={`relative mx-auto mb-6 grid size-16 place-items-center rounded-[20px] border ${
          status === "success"
            ? "border-success bg-[color-mix(in_oklab,var(--success)_12%,var(--surface))] text-success"
            : status === "error"
              ? "border-danger bg-[color-mix(in_oklab,var(--danger)_10%,var(--surface))] text-danger"
              : "border-primary bg-[color-mix(in_oklab,var(--primary)_10%,var(--surface))] text-primary"
        }`}
      >
        {status === "working" ? (
          <span className="size-7 animate-spin rounded-full border-2 border-current border-r-transparent" />
        ) : status === "success" ? (
          <span className="text-[28px] leading-none">✓</span>
        ) : (
          <span className="text-[24px] leading-none">!</span>
        )}
      </div>
      <h1 className="font-display text-[25px] font-black uppercase leading-none">
        {status === "working"
          ? "Connecting your account"
          : status === "success"
            ? "You are signed in"
            : "Sign-in interrupted"}
      </h1>
      <p className="relative mt-3 text-sm leading-[1.65] text-muted">{message}</p>
      {status !== "error" && (
        <div className="relative mt-6 grid grid-cols-3 gap-2" aria-label="Sign-in progress">
          {["Google", "Secure session", "Dashboard"].map((label, index) => {
            const complete = status === "success" || index === 0;
            return (
              <div key={label}>
                <span
                  className={`mx-auto block h-1.5 rounded-full ${
                    complete ? "bg-primary" : "animate-pulse bg-hair"
                  }`}
                />
                <span className="mt-2 block font-mono text-[8px] uppercase tracking-[0.08em] text-muted">
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      )}
      {status === "error" && (
        <Link
          href="/login"
          className="mt-5 inline-flex rounded-[10px] bg-primary px-5 py-3 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-on-primary"
        >
          Back to login
        </Link>
      )}
    </div>
  );
}
