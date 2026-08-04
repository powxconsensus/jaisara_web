"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { FieldLabel, TextInput } from "@/components/ui/field";
import { useToast } from "@/components/shell/toast";

export type AuthMode = "signup" | "login";

/**
 * The sign-up / log-in form (handoff §4.4).
 *
 * The eyebrow deliberately does not repeat the h1, the password field has a
 * show/hide toggle, and on signup the referral code is editable *and*
 * removable in a Club-tinted well.
 */
export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [referral, setReferral] = useState("AVA-7Q2");
  const [referralVisible, setReferralVisible] = useState(true);
  const emailId = useId();
  const passwordId = useId();
  const referralId = useId();

  const isSignup = mode === "signup";

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    toast(isSignup ? "Account created" : "Welcome back");
    router.push("/dashboard");
  };

  return (
    <div className="w-full max-w-[420px] [animation:jsUp_.7s_.08s_cubic-bezier(.2,.8,.2,1)_both]">
      <p className="mb-3.5 font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
        {isSignup ? "Free account // 60 seconds" : "Welcome back // sign in"}
      </p>
      <h1 className="mb-2 font-display text-[28px] font-black uppercase leading-none tracking-[-0.02em]">
        {isSignup ? "Start earning cashback" : "Back to your wallet"}
      </h1>
      <p className="mb-[26px] text-sm text-muted">
        {isSignup
          ? "One account tracks every firm you buy from."
          : "Pick up where your cashback left off."}
      </p>

      {/* Segmented control — each half is a real route. */}
      <div className="mb-5 flex gap-[3px] rounded-[11px] bg-surface-2 p-1">
        {(
          [
            { key: "signup", label: "Sign up", href: "/signup" },
            { key: "login", label: "Log in", href: "/login" },
          ] as const
        ).map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={mode === tab.key}
            className={`flex-1 rounded-lg p-[11px] text-center font-mono text-[11px] font-semibold uppercase tracking-[0.12em] transition-all duration-[250ms] ease-[cubic-bezier(.2,.8,.2,1)] ${
              mode === tab.key ? "bg-surface text-fg" : "text-muted hover:text-fg"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <button
        type="button"
        onClick={() => toast("Google sign-in is not wired up yet", "info")}
        className="flex w-full cursor-pointer items-center justify-center gap-[11px] rounded-[11px] border border-hair bg-surface p-3.5 text-sm font-medium transition duration-[250ms] hover:-translate-y-0.5 hover:border-primary"
      >
        <span
          className="inline-block size-4 rounded-full"
          style={{
            background:
              "conic-gradient(#EA4335 0 25%, #FBBC05 0 50%, #34A853 0 75%, #4285F4 0)",
          }}
        />
        Continue with Google
      </button>

      <div className="my-5 flex items-center gap-3.5">
        <span className="h-px flex-1 bg-hair-soft" />
        <span className="font-mono text-[9px] tracking-[0.2em] text-muted">OR</span>
        <span className="h-px flex-1 bg-hair-soft" />
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <div>
          <FieldLabel htmlFor={emailId}>EMAIL</FieldLabel>
          <TextInput id={emailId} type="email" required placeholder="you@email.com" />
        </div>

        <div>
          <FieldLabel
            htmlFor={passwordId}
            action={
              !isSignup && (
                <button
                  type="button"
                  onClick={() => toast("Password reset link sent", "info")}
                  className="cursor-pointer font-mono text-[9.5px] tracking-[0.1em] text-muted hover:text-fg"
                >
                  FORGOT?
                </button>
              )
            }
          >
            PASSWORD
          </FieldLabel>
          <div className="relative">
            <TextInput
              id={passwordId}
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              placeholder="At least 8 characters"
              className="pr-[74px]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-pressed={showPassword}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer p-1.5 font-mono text-[9.5px] tracking-[0.14em] text-muted hover:text-fg"
            >
              {showPassword ? "HIDE" : "SHOW"}
            </button>
          </div>
        </div>

        {isSignup && referralVisible && (
          <div
            className="rounded-[12px] border p-[15px] [animation:jsUp_.5s_both]"
            style={{
              background: "color-mix(in oklab, var(--club) 8%, var(--surface-2))",
              borderColor: "color-mix(in oklab, var(--club) 30%, var(--hair))",
            }}
          >
            <div className="mb-2.5 flex items-center gap-2.5">
              <span className="size-[5px] rounded-[2px] bg-club" />
              <span className="font-mono text-[9px] tracking-[0.2em] text-club">
                REFERRAL — EDIT OR REMOVE
              </span>
              <button
                type="button"
                onClick={() => setReferralVisible(false)}
                className="ml-auto cursor-pointer font-mono text-[9px] tracking-[0.12em] text-muted hover:text-fg"
              >
                REMOVE ×
              </button>
            </div>
            <input
              id={referralId}
              aria-label="Referral code"
              value={referral}
              onChange={(event) => setReferral(event.target.value)}
              className="w-full rounded-[9px] border border-hair bg-bg px-3.5 py-3 font-mono text-[13.5px] tracking-[0.1em] outline-none transition focus:border-club focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--club)_16%,transparent)]"
            />
            <p className="mt-2.5 text-[11.5px] leading-[1.5] text-muted">
              Ava invited you — you both earn a bonus on your first challenge.
            </p>
          </div>
        )}

        <button
          type="submit"
          className="mt-1 flex cursor-pointer items-center justify-center gap-2.5 rounded-[11px] bg-primary p-[15px] font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] text-on-primary transition duration-[250ms] hover:-translate-y-0.5 hover:brightness-[1.08]"
        >
          {isSignup ? "Create account" : "Log in"}
          <span className="text-[13px]">↗</span>
        </button>
      </form>

      <div className="mt-5 flex items-center gap-2.5">
        <span className="size-[5px] rounded-[2px] bg-success" />
        <span className="font-mono text-[9.5px] tracking-[0.08em] text-muted">
          FREE FOREVER / NO CARD / WITHDRAW FROM $20
        </span>
      </div>
      <p className="mt-3 text-[11px] leading-[1.6] text-muted">
        By continuing you agree to the{" "}
        <Link href="/terms" className="text-primary">
          Terms
        </Link>
        . Cashback is paid from affiliate commission and may be withheld on refunded orders.
      </p>
    </div>
  );
}
