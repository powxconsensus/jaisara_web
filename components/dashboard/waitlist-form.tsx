"use client";

import { useState } from "react";
import { useToast } from "@/components/shell/toast";

/** Email capture for the copytrading waitlist. */
export function WaitlistForm() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        toast("You're on the waitlist");
        setEmail("");
      }}
      className="mb-[34px] flex flex-wrap gap-2.5"
    >
      <input
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@email.com"
        aria-label="Email address"
        className="min-w-[220px] flex-1 rounded-[11px] border border-hair bg-surface-2 px-4 py-3.5 text-sm outline-none focus:border-primary"
      />
      <button
        type="submit"
        className="cursor-pointer rounded-[11px] bg-primary px-6 py-3.5 font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-on-primary transition hover:-translate-y-px hover:brightness-[1.08]"
      >
        Join waitlist
      </button>
    </form>
  );
}
