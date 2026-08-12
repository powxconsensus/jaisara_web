"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/shell/toast";
import { apiErrorMessage } from "@/lib/auth-types";
import { apiFetch } from "@/lib/api-fetch";

/**
 * "Tell me when this ships."
 *
 * No email field. This page is behind sign-in, so the account already has a
 * verified address - asking somebody to retype it only invites a typo into the
 * one list whose entire purpose is being able to reach them.
 *
 * It replaces a form that toasted "you're on the waitlist" and stored nothing,
 * which is worse than having no form at all: it collects a promise and drops it.
 */
export function WaitlistForm({ feature }: { feature: string }) {
  const { toast } = useToast();
  const [state, setState] = useState<{ joined: boolean; total: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await apiFetch(`/api/feature-interest/${feature}`, { cache: "no-store" });
      if (response.ok) setState((await response.json()) as { joined: boolean; total: number });
    } catch {
      // Not knowing the count is survivable; the button still works.
    }
  }, [feature]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the setState is inside load, behind an await
    void load();
  }, [load]);

  const join = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await apiFetch("/api/feature-interest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ feature }),
      });
      const result: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        setError(apiErrorMessage(result, "That could not be saved. Try again."));
        return;
      }

      setState(result as { joined: boolean; total: number });
      toast("We'll email you when it's ready.", "success");
    } catch {
      setError("That could not be saved. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (state?.joined) {
    return (
      <div className="mb-[34px] rounded-[13px] border border-primary/40 bg-[color-mix(in_oklab,var(--primary)_8%,transparent)] px-4 py-3.5">
        <p className="text-[13.5px] font-semibold text-primary">You&rsquo;re on the list.</p>
        <p className="mt-1 text-[12.5px] leading-6 text-muted">
          We&rsquo;ll email the address on your account when copytrading opens. Nothing else - this
          is not a newsletter signup.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-[34px]">
      <button
        type="button"
        onClick={() => void join()}
        disabled={busy}
        className="cursor-pointer rounded-[11px] bg-primary px-6 py-3.5 font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-on-primary transition hover:-translate-y-px hover:brightness-[1.08] disabled:opacity-60"
      >
        {busy ? "Saving…" : "Tell me when it's ready"}
      </button>

      <p className="mt-2.5 text-[12px] text-muted">
        One email when it opens, to the address on your account.
        {state && state.total > 0 && (
          <>
            {" "}
            {state.total} {state.total === 1 ? "member is" : "members are"} waiting.
          </>
        )}
      </p>

      {error && (
        <p role="alert" className="mt-2 text-[12.5px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
