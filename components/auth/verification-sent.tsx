"use client";

import Link from "next/link";

/**
 * What replaces the signup form once the link is on its way.
 *
 * The form used to stay on screen with a notice bolted underneath it, which
 * reads as "something went wrong, try again" - every control that got you here
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
  /** False when a still-valid link was already sent - do not claim a new one. */
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
      {/**
       * Boxless, on the same rhythm as the sign-in form.
       *
       * This was a card, and a card is what made the column look wrong: the
       * hero panel beside it is a tall slab, so a small framed rectangle
       * floating next to it reads as an unrelated dialogue rather than the
       * other half of a pair. The form this screen *replaces* has no frame -
       * eyebrow, heading, lede, then controls, straight onto the background -
       * so wrapping its successor in one made the two steps of a single flow
       * look like two different designs.
       *
       * The measurements below are the form's, deliberately: same 420px column,
       * same eyebrow tracking, same 28px display heading. Landing here should
       * feel like the page continued, not like a modal opened.
       */}
      <p className="mb-3.5 font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
        Check your inbox // one link
      </p>
      <h1 className="mb-2 font-display text-[28px] font-black uppercase leading-none tracking-[-0.02em]">
        Almost there.
      </h1>
      <p className="text-sm text-muted">
        {emailSent ? "We sent a sign-in link to" : "A link is already on its way to"}
      </p>
      {/* The address is the one fact worth reading twice - a typo here is the
          single most common reason nothing arrives, and it is still fixable
          from this screen. */}
      <p className="mt-1.5 break-all font-mono text-[14.5px] tracking-[-0.01em] text-primary">
        {email}
      </p>

      {/* The one framed element left, and it earns the frame: three facts that
          are reference material rather than instructions, so they want to read
          as a block you can skip past. */}
      <dl className="mt-[26px] space-y-2.5 rounded-[12px] border border-hair bg-surface-2 p-4">
        <Detail label="EXPIRES">One hour from now</Detail>
        <Detail label="USES">Once - the link stops working after you open it</Detail>
        <Detail label="NOT THERE?">Check spam, and search for “Jaisara”</Detail>
      </dl>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-[11px] border px-3.5 py-3 text-[12.5px] leading-[1.5] text-danger"
          style={{ borderColor: "color-mix(in oklab, var(--danger) 42%, var(--hair))" }}
        >
          {error}
        </p>
      )}

      {/* Equal columns rather than content-width buttons in a row. Two boxes of
          the same size read as a pair of choices; two different widths read as
          a primary action with an afterthought stuck to it. */}
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={onResend}
          disabled={pending}
          className="cursor-pointer rounded-[11px] bg-primary px-4 py-3.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-on-primary transition hover:brightness-[1.07] disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send another link"}
        </button>
        <button
          type="button"
          onClick={onBack}
          disabled={pending}
          className="cursor-pointer rounded-[11px] border border-hair bg-surface-2 px-4 py-3.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition hover:border-primary hover:text-fg disabled:opacity-60"
        >
          Different address
        </button>
      </div>

      <p className="mt-5 text-[12px] text-muted">
        Already confirmed it?{" "}
        <Link href="/login" className="text-primary">
          Log in
        </Link>
      </p>
    </div>
  );
}

/**
 * One labelled line of reference.
 *
 * `dt`/`dd` inside the `dl` above rather than two spans: these are literally
 * terms and their descriptions, and a screen reader announcing them as a
 * definition list is the difference between three labelled facts and one run-on
 * sentence.
 */
function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-[74px] flex-none pt-px font-mono text-[9px] tracking-[0.13em] text-muted">
        {label}
      </dt>
      <dd className="text-[12.5px] leading-[1.55]">{children}</dd>
    </div>
  );
}
