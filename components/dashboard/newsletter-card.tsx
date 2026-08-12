"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/shell/toast";
import { apiFetch } from "@/lib/api-fetch";
import { apiErrorMessage } from "@/lib/auth-types";

interface NewsletterPreference {
  subscribed: boolean;
  suppressed: boolean;
  suppressionReason: string | null;
}

export function NewsletterCard() {
  const { toast } = useToast();
  const [preference, setPreference] = useState<NewsletterPreference | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void apiFetch("/api/account/newsletter", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as NewsletterPreference | null;
        if (!response.ok || !body) throw new Error("load");
        setPreference(body);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError("Could not load your email preference.");
      });
    return () => controller.abort();
  }, []);

  const hardSuppression =
    preference?.suppressed && preference.suppressionReason !== "UNSUBSCRIBED";

  const update = async () => {
    if (!preference || hardSuppression) return;
    const subscribed = !preference.subscribed;
    setBusy(true);
    setError("");
    try {
      const response = await apiFetch("/api/account/newsletter", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subscribed }),
      });
      const body = (await response.json().catch(() => null)) as NewsletterPreference | null;
      if (!response.ok || !body) {
        setError(apiErrorMessage(body, "Could not update your email preference."));
        return;
      }
      setPreference(body);
      toast(subscribed ? "Reward updates enabled" : "You are unsubscribed");
    } catch {
      setError("Could not update your email preference. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-4 rounded-[18px] border border-hair bg-surface p-[clamp(20px,3vw,26px)]">
      <p className="mb-4 font-mono text-[9.5px] tracking-[0.22em] text-muted">EMAIL UPDATES</p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-[52ch]">
          <h2 className="text-[16px] font-semibold">Deals and reward news</h2>
          <p className="mt-1.5 text-[13px] leading-[1.6] text-muted">
            Get occasional emails about new firms, better offers and reward updates. Account and
            payout emails are always sent when needed.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void update()}
          disabled={!preference || busy || Boolean(hardSuppression)}
          aria-pressed={preference?.subscribed ?? false}
          className="flex min-w-[166px] cursor-pointer items-center justify-center gap-2.5 rounded-[11px] border border-hair px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-55"
        >
          <span
            aria-hidden="true"
            className={`grid size-5 place-items-center rounded-[6px] border text-[11px] ${
              preference?.subscribed
                ? "border-primary bg-primary text-on-primary"
                : "border-hair bg-bg text-transparent"
            }`}
          >
            ✓
          </span>
          {busy
            ? "Saving"
            : preference?.subscribed
              ? "Unsubscribe"
              : "Subscribe"}
        </button>
      </div>
      {hardSuppression && (
        <p className="mt-3 text-[12px] text-warning">
          This address cannot receive marketing email right now. Contact support if you want it
          reviewed.
        </p>
      )}
      {error && <p className="mt-3 text-[12px] text-danger">{error}</p>}
    </section>
  );
}
