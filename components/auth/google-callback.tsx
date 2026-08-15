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
        // Long enough to be read. At 650ms the success state was drawn and
        // navigated away from inside a blink, so the last thing a member saw
        // was the working state - which reads as a stall, not as success.
        window.setTimeout(() => window.location.replace("/dashboard"), 1_200);
      } catch {
        setStatus("error");
        setMessage("The authentication service is unavailable. Please try again.");
      }
    })();
  }, []);

  const stage = status === "success" ? 3 : status === "error" ? 1 : 2;

  /**
   * The same column the form occupied, deliberately: width, eyebrow, display
   * heading, sub-line, all in the same places.
   *
   * Returning from Google used to land on a small bordered card floating in
   * the middle of the column, so the screen the member had just been filling
   * in collapsed into a box a third its size. Nothing here is a card - coming
   * back from the provider should read as the same page continuing, which is
   * also how it reads to somebody who never left, because the redirect can
   * resolve fast enough that this screen is only a flash.
   */
  return (
    <div className="w-full max-w-[420px] [animation:jsUp_.7s_.08s_cubic-bezier(.2,.8,.2,1)_both]">
      <p className="mb-3.5 font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
        {status === "error" ? "Sign-in // interrupted" : "Google // signing you in"}
      </p>
      <h1 className="mb-2 font-display text-[28px] font-black uppercase leading-none tracking-[-0.02em]">
        {status === "working"
          ? "Connecting your account"
          : status === "success"
            ? "You are signed in"
            : "Sign-in interrupted"}
      </h1>
      <p className="mb-[26px] text-sm leading-[1.65] text-muted">{message}</p>

      {status !== "error" && (
        <ol
          className="mb-[26px] flex flex-col border-t border-hair-soft"
          aria-label="Sign-in progress"
        >
          {["Google verified", "Secure session", "Your dashboard"].map((label, index) => {
            const done = index < stage - 1 || status === "success";
            const active = index === stage - 1 && status !== "success";

            return (
              <li
                key={label}
                className="flex items-center gap-3.5 border-b border-hair-soft py-3.5"
              >
                <span
                  className={`grid size-5 flex-none place-items-center rounded-full border text-[10px] ${
                    done
                      ? "border-primary bg-primary text-on-primary"
                      : active
                        ? "border-primary text-primary"
                        : "border-hair text-muted"
                  }`}
                >
                  {done ? (
                    "✓"
                  ) : active ? (
                    <span className="size-2.5 animate-spin rounded-full border border-current border-r-transparent" />
                  ) : null}
                </span>
                <span
                  className={`font-mono text-[11px] uppercase tracking-[0.12em] ${
                    done || active ? "text-fg" : "text-muted"
                  }`}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {status === "error" && (
        <Link
          href="/login"
          className="inline-flex rounded-[11px] bg-primary px-5 py-3.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-on-primary transition hover:-translate-y-px hover:brightness-[1.08]"
        >
          Back to login
        </Link>
      )}
    </div>
  );
}
