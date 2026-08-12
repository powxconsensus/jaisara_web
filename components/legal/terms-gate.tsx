"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { useEffect, useState } from "react";
import { GATE_POINTS, TERMS_STORAGE_KEY, TERMS_VERSION } from "@/lib/data/legal";

/**
 * Blocking acceptance gate on first visit (handoff §4.11). The accepted
 * version is persisted, so a material change re-prompts everyone.
 *
 * Rendered closed on the server and opened after mount, so it never appears in
 * prerendered HTML for someone who already accepted.
 */
export function TermsGate() {
  const [open, setOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    let accepted: string | null = null;
    try {
      accepted = localStorage.getItem(TERMS_STORAGE_KEY);
    } catch {
      /* storage unavailable - do not block the page */
      return;
    }
    if (accepted !== TERMS_VERSION) {
      const id = setTimeout(() => setOpen(true), 500);
      return () => clearTimeout(id);
    }
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(TERMS_STORAGE_KEY, TERMS_VERSION);
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  return (
    <Dialog.Root open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[400] bg-[color-mix(in_oklab,var(--bg)_74%,transparent)] [backdrop-filter:blur(16px)]" />
        <Dialog.Content
          /* No dismiss paths - acceptance is the only way through. */
          onEscapeKeyDown={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
          className="fixed left-1/2 top-1/2 z-[401] w-[calc(100%-40px)] max-w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-[20px] border border-hair bg-surface p-[clamp(20px,4vw,34px)] shadow-card [animation:jsUp_.45s_cubic-bezier(.2,.8,.2,1)_both]"
        >
          <div className="mb-[22px] flex items-center justify-between gap-3">
            <span className="grid size-[38px] place-items-center rounded-[11px] bg-primary font-display text-[17px] font-black text-on-primary">
              J
            </span>
            <span className="font-mono text-[9.5px] tracking-[0.22em] text-muted">
              ACCESS // TERMS
            </span>
          </div>

          <Dialog.Title className="mb-3 font-display text-[26px] font-black uppercase tracking-[-0.02em]">
            Before you start
          </Dialog.Title>
          <Dialog.Description className="mb-5 text-sm leading-[1.65] text-muted">
            Four things worth knowing before using Jaisara - the complete terms and privacy policy
            are one click away.
          </Dialog.Description>

          <ol className="mb-5 flex max-h-[clamp(110px,22vh,190px)] flex-col gap-3.5 overflow-y-auto rounded-[14px] border border-hair-soft bg-surface-2 p-[18px]">
            {GATE_POINTS.map((point, i) => (
              <li key={point} className="flex gap-3">
                <span className="pt-[3px] font-mono text-[10.5px] text-primary">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[13.5px] leading-[1.6] text-muted">{point}</span>
              </li>
            ))}
          </ol>

          <label className="mb-5 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className="grid size-[21px] flex-none place-items-center rounded-md border-[1.5px] text-xs transition-all"
              style={{
                borderColor: agreed ? "var(--primary)" : "var(--hair)",
                background: agreed ? "var(--primary)" : "transparent",
                color: "var(--on-primary)",
              }}
            >
              {agreed ? "✓" : ""}
            </span>
            <span className="text-[13.5px] leading-[1.55] text-muted">
              I have read and accept the{" "}
              <Link href="/terms" className="text-primary">
                Terms &amp; conditions
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-primary">
                Privacy policy
              </Link>
              .
            </span>
          </label>

          <button
            type="button"
            onClick={accept}
            disabled={!agreed}
            className="w-full cursor-pointer rounded-[11px] p-[15px] text-center font-mono text-xs font-semibold uppercase tracking-[0.16em] transition-all disabled:cursor-not-allowed"
            style={{
              background: agreed ? "var(--primary)" : "var(--surface-2)",
              color: agreed ? "var(--on-primary)" : "var(--text-muted)",
            }}
          >
            Accept &amp; continue
          </button>

          <p className="mt-3.5 text-center font-mono text-[9.5px] tracking-[0.1em] text-muted">
            DOCUMENTS AVAILABLE ANY TIME IN THE FOOTER
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
