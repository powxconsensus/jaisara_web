"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { FieldLabel, TextInput } from "@/components/ui/field";
import { useToast } from "@/components/shell/toast";
import { apiErrorMessage } from "@/lib/auth-types";
import { VerificationSent } from "@/components/auth/verification-sent";
import { ForgotPassword } from "@/components/auth/forgot-password";
import { isStrongPassword, passwordPolicyMessage } from "@/lib/password-policy";
import { PasswordRequirements } from "@/components/auth/password-requirements";

export type AuthMode = "signup" | "login";

interface VerificationNotice {
  email: string;
  emailSent: boolean;
}

function GoogleMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 18 18"
      className="size-[18px] flex-none"
    >
      <path
        fill="#4285F4"
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.482h4.844a4.14 4.14 0 0 1-1.797 2.715v2.258h2.909c1.703-1.568 2.684-3.878 2.684-6.614Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.468-.806 5.956-2.181l-2.909-2.258c-.806.54-1.836.859-3.047.859-2.344 0-4.328-1.584-5.037-3.71H.956v2.332A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.963 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.281-1.71V4.958H.956A9 9 0 0 0 0 9c0 1.452.347 2.827.956 4.042l3.007-2.332Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.507.454 3.441 1.346l2.581-2.581C13.464.892 11.426 0 9 0A9 9 0 0 0 .956 4.958L3.963 7.29C4.672 5.164 6.656 3.58 9 3.58Z"
      />
    </svg>
  );
}

function safeNextPath(): string {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//")
    ? next
    : "/dashboard";
}

/**
 * The sign-up / log-in form (handoff §4.4).
 *
 * The eyebrow deliberately does not repeat the h1, the password field has a
 * show/hide toggle, and on signup the referral code is editable *and*
 * removable in a Club-tinted well.
 */
export function AuthForm({
  mode,
  initialReferral = "",
  notice,
}: {
  mode: AuthMode;
  initialReferral?: string;
  /**
   * A message from somewhere the member has just been redirected from - today
   * only the OAuth callback, which is a server route with nothing to render.
   * Shown until they type, at which point their own attempt is the thing worth
   * reporting on.
   */
  notice?: string;
}) {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [referral, setReferral] = useState(initialReferral);
  const [referralVisible, setReferralVisible] = useState(
    Boolean(initialReferral),
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newsletter, setNewsletter] = useState(true);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [verification, setVerification] = useState<VerificationNotice | null>(
    null,
  );
  const [recovering, setRecovering] = useState(false);
  const emailId = useId();
  const passwordId = useId();
  const passwordRequirementsId = useId();
  const referralId = useId();

  const isSignup = mode === "signup";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setVerification(null);

    if (isSignup && !isStrongPassword(password)) {
      setFormError(
        passwordPolicyMessage(password) ?? "Choose a stronger password.",
      );
      return;
    }

    setPending(true);

    try {
      const response = await fetch(
        `/api/auth/${isSignup ? "sign-up" : "sign-in"}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(
            isSignup
              ? {
                  email,
                  password,
                  referralCode:
                    referralVisible && referral.trim()
                      ? referral.trim()
                      : undefined,
                  subscribeNewsletter: newsletter,
                  acceptedTerms: true,
                }
              : { email, password },
          ),
        },
      );
      const body = (await response.json().catch(() => null)) as {
        user?: { emailVerified?: boolean };
        email?: string;
        deletionCancelled?: boolean;
        verificationEmailSent?: boolean;
      } | null;

      if (!response.ok) {
        setFormError(
          apiErrorMessage(body, "Authentication failed. Please try again."),
        );
        return;
      }

      if (isSignup) {
        setVerification({
          email: body?.email ?? email,
          emailSent: body?.verificationEmailSent !== false,
        });
        toast(
          body?.verificationEmailSent === false
            ? "Verification already sent"
            : "Verification email sent",
        );
        return;
      }

      if (body?.user?.emailVerified === false) {
        setVerification({
          email,
          emailSent: body.verificationEmailSent === true,
        });
        toast("Verify your email to continue", "info");
        return;
      }

      toast(
        body?.deletionCancelled
          ? "Welcome back. Your account deletion request was cancelled."
          : "Welcome back",
      );
      window.location.assign(safeNextPath());
    } catch {
      setFormError(
        "The authentication service is unavailable. Please try again.",
      );
    } finally {
      setPending(false);
    }
  };

  const startGoogle = () => {
    const target = new URL("/api/auth/google", window.location.origin);
    if (isSignup && referralVisible && referral.trim()) {
      target.searchParams.set("ref", referral.trim());
    }
    if (isSignup && newsletter) target.searchParams.set("newsletter", "1");
    window.location.assign(target.toString());
  };

  const resendVerification = async () => {
    if (!verification) return;
    setPending(true);
    setFormError(null);
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: verification.email }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setFormError(
          apiErrorMessage(body, "Could not send another verification email."),
        );
        return;
      }
      setVerification({ ...verification, emailSent: true });
      toast("A fresh verification link was sent", "info");
    } catch {
      setFormError(
        "The authentication service is unavailable. Please try again.",
      );
    } finally {
      setPending(false);
    }
  };

  // Recovery takes the whole screen. Firing the request from under the sign-in
  // form left somebody who had just said they cannot log in looking at the
  // form that does not work for them, with a toast as the only feedback.
  if (recovering) {
    return (
      <ForgotPassword
        initialEmail={email}
        onBack={() => setRecovering(false)}
      />
    );
  }

  /**
   * Once the link is sent there is nothing left to do on this screen, so the
   * form is replaced rather than annotated. Leaving a lit Create-account
   * button under a "check your inbox" notice invites the one action that
   * cannot help.
   */
  if (verification) {
    return (
      <VerificationSent
        email={verification.email}
        emailSent={verification.emailSent}
        pending={pending}
        error={formError}
        onResend={() => void resendVerification()}
        onBack={() => {
          setVerification(null);
          setFormError(null);
          setPassword("");
        }}
      />
    );
  }

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

      {/* Segmented control - each half is a real route. */}
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
              mode === tab.key
                ? "bg-surface text-fg"
                : "text-muted hover:text-fg"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <button
        type="button"
        onClick={startGoogle}
        disabled={pending}
        className="flex w-full cursor-pointer items-center justify-center gap-[11px] rounded-[11px] border border-hair bg-surface p-3.5 text-sm font-medium transition duration-[250ms] hover:-translate-y-0.5 hover:border-primary"
      >
        <GoogleMark />
        Continue with Google
      </button>

      <div className="my-5 flex items-center gap-3.5">
        <span className="h-px flex-1 bg-hair-soft" />
        <span className="font-mono text-[9px] tracking-[0.2em] text-muted">
          OR
        </span>
        <span className="h-px flex-1 bg-hair-soft" />
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <div>
          <FieldLabel htmlFor={emailId}>EMAIL</FieldLabel>
          <TextInput
            id={emailId}
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@email.com"
            disabled={pending}
          />
        </div>

        <div>
          <FieldLabel
            htmlFor={passwordId}
            action={
              !isSignup && (
                <button
                  type="button"
                  onClick={() => setRecovering(true)}
                  disabled={pending}
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
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={isSignup ? "new-password" : "current-password"}
              aria-describedby={isSignup ? passwordRequirementsId : undefined}
              required
              minLength={isSignup ? 10 : 1}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={
                isSignup ? "At least 10 characters" : "Your password"
              }
              disabled={pending}
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
          {isSignup && (
            <PasswordRequirements
              password={password}
              id={passwordRequirementsId}
            />
          )}
        </div>

        {/*
          A full-width row rather than the 9.5px muted text link this was.
          Somebody arriving with a code from a friend could not find where to
          put it - and a referral code that goes unentered is the one signup
          detail that cannot be fixed afterwards, because the first valid code
          is permanently attached and there is no second chance to attach one.
          Styled to match the expanded card below so the two read as one
          control in two states.
        */}
        {isSignup && !referralVisible && (
          <button
            type="button"
            onClick={() => setReferralVisible(true)}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-[12px] border border-dashed px-[15px] py-3.5 text-left transition hover:brightness-110"
            style={{
              background: "color-mix(in oklab, var(--club) 5%, var(--surface-2))",
              borderColor: "color-mix(in oklab, var(--club) 34%, var(--hair))",
            }}
          >
            <span className="size-[5px] rounded-[2px] bg-club" />
            <span className="font-mono text-[9px] tracking-[0.2em] text-club">
              HAVE A REFERRAL CODE?
            </span>
            <span className="ml-auto font-mono text-[9px] tracking-[0.14em] text-muted">
              ADD IT +
            </span>
          </button>
        )}

        {isSignup && referralVisible && (
          <div
            className="rounded-[12px] border p-[15px] [animation:jsUp_.5s_both]"
            style={{
              background:
                "color-mix(in oklab, var(--club) 8%, var(--surface-2))",
              borderColor: "color-mix(in oklab, var(--club) 30%, var(--hair))",
            }}
          >
            <div className="mb-2.5 flex items-center gap-2.5">
              <span className="size-[5px] rounded-[2px] bg-club" />
              <span className="font-mono text-[9px] tracking-[0.2em] text-club">
                REFERRAL - EDIT OR REMOVE
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
              aria-label="Referral code or username"
              value={referral}
              onChange={(event) => setReferral(event.target.value)}
              name="referralCode"
              placeholder="Code or username"
              disabled={pending}
              className="w-full rounded-[9px] border border-hair bg-bg px-3.5 py-3 font-mono text-[13.5px] tracking-[0.1em] outline-none transition focus:border-club focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--club)_16%,transparent)]"
            />
            <p className="mt-2.5 text-[11.5px] leading-[1.5] text-muted">
              A code or a member&rsquo;s username both work. The first valid one is
              permanently attached to your account.
            </p>
          </div>
        )}

        {/* The form's own error wins: once they have tried, what happened to
            their attempt matters more than how they arrived here. */}
        {(formError ?? notice) && (
          <div
            role="alert"
            className="rounded-[11px] border px-3.5 py-3 text-[12.5px] leading-[1.5] text-danger"
            style={{
              borderColor:
                "color-mix(in oklab, var(--danger) 42%, var(--hair))",
            }}
          >
            {formError ?? notice}
          </div>
        )}

        {isSignup && (
          <label className="flex cursor-pointer items-center gap-2.5 py-1 text-[11.5px] leading-[1.45] text-muted">
            <input
              type="checkbox"
              checked={newsletter}
              onChange={(event) => setNewsletter(event.target.checked)}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className={`grid size-[18px] flex-none place-items-center rounded-[5px] border text-[11px] font-bold transition ${
                newsletter
                  ? "border-primary bg-primary text-on-primary"
                  : "border-hair bg-surface text-transparent"
              }`}
            >
              ✓
            </span>
            <span>
              Send me deal and reward updates. You can turn these off from
              Account anytime.
            </span>
          </label>
        )}

        <button
          type="submit"
          disabled={pending || (isSignup && !isStrongPassword(password))}
          className="mt-1 flex cursor-pointer items-center justify-center gap-2.5 rounded-[11px] bg-primary p-[15px] font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] text-on-primary transition duration-[250ms] hover:-translate-y-0.5 hover:brightness-[1.08] disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "Please wait…" : isSignup ? "Create account" : "Log in"}
          <span className="text-[13px]">↗</span>
        </button>
      </form>

      <div className="mt-5 flex items-center gap-2.5">
        <span className="size-[5px] rounded-[2px] bg-success" />
        <span className="font-mono text-[9.5px] tracking-[0.08em] text-muted">
          FREE FOREVER / NO CARD / CONFIGURABLE PAYOUT OPTIONS
        </span>
      </div>
      <p className="mt-3 text-[11px] leading-[1.6] text-muted">
        By creating an account you agree to the{" "}
        <Link href="/terms" className="text-primary">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-primary">
          Privacy Policy
        </Link>
        . Reward eligibility, verification, holds and reversals are explained in
        the Terms.
      </p>
    </div>
  );
}
