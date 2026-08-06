"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { apiErrorMessage } from "@/lib/auth-types";

type CallbackStatus = "working" | "error";

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
        window.location.replace("/dashboard");
      } catch {
        setStatus("error");
        setMessage("The authentication service is unavailable. Please try again.");
      }
    })();
  }, []);

  return (
    <div className="w-full max-w-[420px] rounded-[18px] border border-hair bg-surface p-7 text-center shadow-card">
      <span
        className={`mx-auto mb-5 block size-2 rounded-[3px] ${
          status === "working" ? "animate-pulse bg-info" : "bg-danger"
        }`}
      />
      <h1 className="font-display text-[25px] font-black uppercase leading-none">
        {status === "working" ? "Signing you in" : "Sign-in interrupted"}
      </h1>
      <p className="mt-3 text-sm leading-[1.65] text-muted">{message}</p>
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
