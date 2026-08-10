"use client";

import Link from "next/link";

/**
 * What replaces the signup form once the link is on its way.
 *
 * The form used to stay on screen with a notice bolted underneath it, which
 * reads as "something went wrong, try again" — every control that got you here
 * is still lit, still inviting a second press, and the one instruction that
 * matters is competing with a password field for attention.
 *
 * So the form goes. There is exactly one thing to do at this point and it
 * happens in another application, so the screen's whole job is to say which
 * address to look in and get out of the way. Two escape hatches, both quiet:
 * send another link, or go back and use a different address.
 */
export function VerificationSent({
  email,
  emailSent,
  pending,
  error,
  onResend,
  onBack,
}: {
  email: string;
  /** False when a still-valid link was already sent — do not claim a new one. */
  emailSent: boolean;
  pending: boolean;
  /** A failed resend. Shown here because there is no form left to show it on. */
  error?: string | null;
  onResend: () => void;
  onBack: () => void;
}) {
  return (
    <div
      className="w-full max-w-[420px] [animation:jsUp_.5s_cubic-bezier(.2,.8,.2,1)_both]"
      role="status"
      aria-live="polite"
    >
      <div className="overflow-hidden rounded-[18px] border border-hair bg-surface">
        {/* The docket header, as everywhere else a Jaisara object is issued. */}
        <div className="px-[26px] pb-5 pt-[26px]">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-info">
            [ Check your inbox ]
          </p>
          <h1 className="mt-3 font-display text-[27px] font-black uppercase leading-none tracking-[-0.02em]">
            Almost there.
          </h1>
        </div>

        {/* Punched edge — the same device the support desk and the receipt deck
            use, so this reads as a Jaisara document rather than a modal. */}
        <div
          aria-hidden
          className="h-[9px] w-full"
          style={{
            background:
              "radial-gradient(circle at 5px 4px, var(--bg) 4px, transparent 4.5px) 0 0/14px 9px repeat-x",
          }}
        />

        <div className="px-[26px] pb-[26px] pt-5">
          <p className="text-[13px] leading-[1.7] text-muted">
            {emailSent
              ? "We sent a sign-in link to"
              : "A link is already on its way to"}
          </p>
          {/* The address is the one fact worth reading twice — a typo here is
              the single most common reason nothing arrives, and it is still
              fixable from this screen. */}
          <p className="mt-1.5 break-all font-mono text-[14.5px] tracking-[-0.01em] text-primary">
            {email}
          </p>

          <div className="mt-5 space-y-2.5 border-t border-hair-soft pt-5">
            <Detail label="EXPIRES">One hour from now</Detail>
            <Detail label="USES">Once — the link stops working after you open it</Detail>
            <Detail label="NOT THERE?">Check spam, and search for “Jaisara”</Detail>
          </div>

          {error && (
            <p
              role="alert"
              className="mt-5 rounded-[10px] border px-3.5 py-2.5 text-[12.5px] leading-[1.5] text-danger"
              style={{ borderColor: "color-mix(in oklab, var(--danger) 42%, var(--hair))" }}
            >
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={onResend}
              disabled={pending}
              className="cursor-pointer rounded-[10px] bg-primary px-5 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-on-primary transition hover:brightness-[1.07] disabled:cursor-wait disabled:opacity-60"
            >
              {pending ? "Sending…" : "Send another link"}
            </button>
            <button
              type="button"
              onClick={onBack}
              disabled={pending}
              className="cursor-pointer rounded-[10px] border border-hair px-5 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition hover:border-primary hover:text-fg disabled:opacity-60"
            >
              Use a different address
            </button>
          </div>
        </div>
      </div>

      <p className="mt-4 text-center text-[12px] text-muted">
        Already confirmed it?{" "}
        <Link href="/login" className="text-primary">
          Log in
        </Link>
      </p>
    </div>
  );
}

/** One labelled line in the docket body. */
function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="w-[74px] flex-none pt-px font-mono text-[9px] tracking-[0.13em] text-muted">
        {label}
      </span>
      <span className="text-[12.5px] leading-[1.55]">{children}</span>
    </div>
  );
}
