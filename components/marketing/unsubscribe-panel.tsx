"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiErrorMessage } from "@/lib/auth-types";

/**
 * Leaving the newsletter.
 *
 * Confirm-first rather than one-click, and that distinction is deliberate:
 * mail providers get a true one-click endpoint through the `List-Unsubscribe`
 * header, which is what the standard requires and what keeps us deliverable.
 * A person who *clicked a link in the footer* is a different case — half of
 * them are annoyed by one particular email, not by hearing from us at all, and
 * the honest thing is to say what they lose and offer the smaller door.
 *
 * What it must not become is a maze. One button ends it, it is the primary
 * action on the page, and nothing is hidden behind a second screen.
 */
export function UnsubscribePanel({ token }: { token: string }) {
  const [state, setState] = useState<"asking" | "working" | "done">("asking");
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setState("working");
    setError(null);

    try {
      const response = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        setError(apiErrorMessage(body, "We could not complete that. Please try again."));
        setState("asking");
        return;
      }

      setState("done");
    } catch {
      setError("We could not reach the mail service. Please try again.");
      setState("asking");
    }
  };

  if (!token) {
    return (
      <Shell eyebrow="[ LINK NOT VALID ]" title="This link has expired">
        <p className="text-[13.5px] leading-7 text-muted">
          Unsubscribe links are unique to one member. If you copied this one by hand, some of it
          may be missing — open the link in the email itself instead.
        </p>
        <p className="mt-4 text-[13.5px] leading-7 text-muted">
          You can also turn the newsletter off from{" "}
          <Link href="/dashboard" className="text-primary hover:underline">
            your account settings
          </Link>{" "}
          at any time.
        </p>
      </Shell>
    );
  }

  if (state === "done") {
    return (
      <Shell eyebrow="[ DONE ]" title="You're off the newsletter">
        <p className="text-[13.5px] leading-7 text-muted">
          No more campaign emails. It takes effect immediately — anything already on its way out
          may still land, but nothing new will be sent.
        </p>
        <div
          className="mt-6 rounded-[14px] border p-4"
          style={{
            borderColor: "color-mix(in oklab, var(--info) 30%, transparent)",
            background: "color-mix(in oklab, var(--info) 6%, transparent)",
          }}
        >
          <p className="text-[12.5px] leading-6 text-muted">
            <strong className="text-fg">You will still get account email.</strong> Cashback
            approvals, payout confirmations, password resets and security notices are not
            marketing, and switching those off would mean not being told when your money moves.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-2.5">
          <Button asChild size="lg">
            <Link href="/dashboard">Go to your wallet</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/dashboard">Changed your mind? Re-subscribe in settings</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell eyebrow="[ BEFORE YOU GO ]" title="Unsubscribe from the newsletter?">
      <p className="text-[13.5px] leading-7 text-muted">
        We send it when there is something worth sending — a new firm listed, a coupon that beats
        the one you used, a change to how cashback is paid. It is the only way to hear about a
        better rate on a challenge you were already going to buy.
      </p>

      <ul className="mt-5 space-y-2.5">
        {[
          "New firms and challenges as they are added",
          "Coupon changes that lower what you pay",
          "Occasional — not weekly, and never sold to anyone",
        ].map((line) => (
          <li key={line} className="flex gap-2.5 text-[13px] leading-6 text-muted">
            <span aria-hidden className="mt-[7px] size-1.5 flex-none rounded-full bg-primary" />
            {line}
          </li>
        ))}
      </ul>

      <div
        className="mt-6 rounded-[14px] border p-4"
        style={{
          borderColor: "color-mix(in oklab, var(--info) 30%, transparent)",
          background: "color-mix(in oklab, var(--info) 6%, transparent)",
        }}
      >
        <p className="text-[12.5px] leading-6 text-muted">
          <strong className="text-fg">Either way, your account email keeps working.</strong>{" "}
          Cashback approvals, payouts and security notices are sent separately and are not
          affected by this.
        </p>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-[12.5px] leading-6 text-danger">
          {error}
        </p>
      )}

      <div className="mt-7 flex flex-wrap gap-2.5">
        {/* The primary action is *staying* — but unsubscribing is one press
            away, in full contrast, not a grey link in the corner. A dark
            pattern here costs more than the subscriber: it earns a spam
            complaint, and those are what get a sending domain suspended. */}
        <Button asChild size="lg">
          <Link href="/deals">Keep me subscribed</Link>
        </Button>
        <Button
          size="lg"
          variant="outline"
          disabled={state === "working"}
          onClick={() => void confirm()}
        >
          {state === "working" ? "Unsubscribing…" : "Yes, unsubscribe me"}
        </Button>
      </div>
    </Shell>
  );
}

/** The receipt-panel frame both states share. */
function Shell({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto w-full max-w-[560px] px-[var(--pad)] py-[clamp(48px,9vw,110px)]">
      <div className="rounded-[18px] border border-hair bg-surface p-[clamp(22px,4vw,38px)]">
        <p className="font-mono text-[10px] tracking-[0.22em] text-primary">{eyebrow}</p>
        <h1 className="mt-3 font-display text-[clamp(24px,4vw,32px)] font-black leading-[1.1] tracking-[-0.02em]">
          {title}
        </h1>
        <div className="mt-5">{children}</div>
      </div>
    </section>
  );
}
