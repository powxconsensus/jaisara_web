"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useId, useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { useToast } from "@/components/shell/toast";
import { apiFetch } from "@/lib/api-fetch";
import { apiErrorMessage } from "@/lib/auth-types";
import { useResource } from "@/lib/resource";
import { invalidateAll } from "@/lib/resource-cache";

/**
 * Choosing a username.
 *
 * The username *is* a referral link, which is the whole reason this screen is
 * more than a text field. Two consequences have to be on screen before somebody
 * commits:
 *
 *  1. **Changes are rationed** - three ever, fifteen days apart. A counter that
 *     only appears once it is exhausted is a counter nobody could plan around,
 *     so the remaining count is always shown.
 *  2. **The old name stops crediting them.** Links already shared - a Discord
 *     message, a YouTube description, a screenshot - keep resolving to a name
 *     that now belongs to nobody, and every signup through them is
 *     unattributed. That is the confirmation step, not a footnote.
 *
 * The auto-minted code is shown beside it precisely because it never changes:
 * it is the answer to "so is my old link dead", and having it in view makes the
 * warning read as a trade-off rather than a threat.
 */

interface Allowance {
  username: string | null;
  changesUsed: number;
  changesRemaining: number;
  nextChangeAt: string | null;
  canChangeNow: boolean;
}

/** Mirrors the API. Checked here only to explain the rule before a round trip. */
const USERNAME_PATTERN = /^[a-z][a-z0-9_]{2,19}$/;

function localComplaint(value: string): string | null {
  if (!value) return null;
  if (value.length < 3) return "At least 3 characters.";
  if (value.length > 20) return "At most 20 characters.";
  if (!/^[a-z]/.test(value)) return "Has to start with a letter.";
  if (!USERNAME_PATTERN.test(value)) return "Letters, numbers and underscores only.";
  return null;
}

function dayLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "later";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

export function UsernameSection() {
  const { user, refresh } = useAuth();
  const { toast } = useToast();
  const fieldId = useId();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  /**
   * The last completed check, tagged with the name it was for.
   *
   * Storing the answer rather than a status is what keeps this out of an
   * effect: "idle" and "checking" are both derivable from what has been typed
   * versus what has been answered, so nothing needs resetting when the field
   * changes. A plain status would have to be cleared on every keystroke, which
   * is setState inside an effect - the pattern React's own lint rule forbids.
   */
  const [checked, setChecked] = useState<{ name: string; available: boolean } | null>(null);
  const [checking, setChecking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  /**
   * The allowance, through the shared cache.
   *
   * The card still works without it - the API is what actually enforces the
   * change limit - so a failure is ignored rather than surfaced. `reload()`
   * after a save replaces the hand-rolled reload key: the remaining count and
   * the next-allowed date have to come from the server rather than be guessed
   * at here.
   */
  const allowanceResource = useResource<Allowance>("/api/auth/me/username");
  const allowance = allowanceResource.data;

  const current = allowance?.username ?? user?.username ?? null;
  const normalised = draft.trim().toLowerCase();
  const complaint = localComplaint(normalised);
  const isChange = current !== null;

  /** Nothing to ask the server about a blank, malformed, or unchanged name. */
  const worthChecking = Boolean(normalised) && !complaint && normalised !== current;

  const availability: "idle" | "checking" | "free" | "taken" = !worthChecking
    ? "idle"
    : checked?.name === normalised
      ? checked.available
        ? "free"
        : "taken"
      : checking
        ? "checking"
        : "idle";

  /**
   * Availability, debounced.
   *
   * The endpoint answers "does this account exist" for any name somebody tries,
   * so it is rate limited server-side. Waiting out a pause in typing keeps a
   * normal edit well inside that limit instead of spending it a keystroke at a
   * time.
   */
  useEffect(() => {
    if (!worthChecking) return;

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setChecking(true);
      void apiFetch(`/api/auth/me/username/available?username=${encodeURIComponent(normalised)}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (response) =>
          response.ok ? ((await response.json()) as { available?: boolean }) : null,
        )
        .then((body) => {
          if (controller.signal.aborted) return;
          setChecked({ name: normalised, available: Boolean(body?.available) });
        })
        .catch(() => undefined)
        .finally(() => {
          if (!controller.signal.aborted) setChecking(false);
        });
    }, 400);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [normalised, worthChecking]);

  const save = async () => {
    setBusy(true);
    try {
      const response = await apiFetch("/api/auth/me/username", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: normalised }),
      });
      const body: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        toast(apiErrorMessage(body, "Could not save that username."), "warning");
        return;
      }

      setConfirming(false);
      // Collapse back to the summary, which now shows the new handle - the same
      // way the email section returns to a row rather than leaving a spent form
      // open under a success toast.
      setOpen(false);
      setDraft("");
      setChecked(null);
      // The handle is also the referral code, so a change moves the invite link
      // and the club standing too - not just this card's allowance.
      invalidateAll();
      await Promise.all([allowanceResource.reload(), refresh()]);
      toast(isChange ? "Username changed." : "Username set.");
    } catch {
      toast("The account service is unavailable. Please try again.", "warning");
    } finally {
      setBusy(false);
    }
  };

  const blocked = !allowance?.canChangeNow && isChange;
  const canSubmit =
    !busy && !blocked && normalised.length > 0 && !complaint && availability === "free";

  return (
    <>
      <div className="my-6 h-px bg-hair" />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[9px] tracking-[0.16em] text-muted">USERNAME</p>
          <h3 className="mt-2 text-sm font-semibold">
            {isChange ? "Change your username" : "Set your username"}
          </h3>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted">
            {/* The current handle when there is one: collapsed, this section has
                to answer "what is mine" without being opened, the same way the
                email row above shows the address rather than only a button. */}
            {isChange ? (
              <>
                Yours is{" "}
                <span className="font-mono text-[11px] text-club">@{current}</span>, and it doubles
                as your referral code - <span className="font-mono text-[11px]">?ref={current}</span>{" "}
                credits you.
              </>
            ) : (
              <>
                Your username doubles as your referral code, so a link ending{" "}
                <span className="font-mono text-[11px] text-club">?ref=yourname</span> credits you.
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isChange && allowance && (
            <span className="rounded-[8px] border border-hair px-2.5 py-1.5 font-mono text-[9px] tracking-[0.12em] text-muted">
              {allowance.changesRemaining} CHANGE{allowance.changesRemaining === 1 ? "" : "S"} LEFT
            </span>
          )}
          {!open && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-[10px] border border-hair px-4 py-2.5 font-mono text-[9px] tracking-[0.14em] text-primary transition hover:border-primary"
            >
              {isChange ? "CHANGE USERNAME" : "SET USERNAME"}
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="mt-4">
          <label
            htmlFor={fieldId}
            className="mb-[7px] block font-mono text-[9px] tracking-[0.14em] text-muted"
          >
            {isChange ? "NEW USERNAME" : "USERNAME"}
          </label>
          <div className="flex max-w-sm items-center gap-0 rounded-[10px] border border-hair bg-surface-2 px-3.5 focus-within:border-primary">
            <span className="font-mono text-[13px] text-muted">@</span>
            <input
              id={fieldId}
              value={draft}
              disabled={blocked}
              maxLength={20}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder={current ?? "yourname"}
              onChange={(event) => setDraft(event.target.value)}
              className="w-full bg-transparent px-1.5 py-3 font-mono text-[13px] outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
            {availability === "checking" && (
              <span className="font-mono text-[9px] tracking-[0.12em] text-muted">…</span>
            )}
            {availability === "free" && (
              <span className="font-mono text-[9px] tracking-[0.12em] text-success">FREE</span>
            )}
            {availability === "taken" && (
              <span className="font-mono text-[9px] tracking-[0.12em] text-danger">TAKEN</span>
            )}
          </div>
          {complaint && <p className="mt-2 text-[11.5px] text-warning">{complaint}</p>}

          {/* The reassurance that makes the change warning survivable. The code
              itself is in the grid above rather than repeated here - one card
              should not print the same value twice under two labels. */}
          <p className="mt-2.5 max-w-xl text-[11px] leading-[1.5] text-muted">
            Rationed to {allowance?.changesRemaining ?? 0} more{" "}
            {allowance?.changesRemaining === 1 ? "change" : "changes"}, and a name you give up is
            never re-issued. Your permanent referral code above keeps crediting you whatever this
            says.
          </p>

          {blocked && allowance && (
            <p className="mt-3 max-w-xl text-[12px] leading-[1.6] text-warning">
              {allowance.changesRemaining === 0
                ? "You have used all your username changes. Contact support if you need it changed again."
                : `You can change your username again on ${dayLabel(allowance.nextChangeAt ?? "")}.`}
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-2.5">
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => (isChange ? setConfirming(true) : void save())}
              className="cursor-pointer rounded-[10px] bg-primary px-[22px] py-3 font-mono text-[11px] tracking-[0.14em] text-on-primary transition hover:brightness-[1.06] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {busy ? "SAVING…" : isChange ? "CHANGE USERNAME" : "SET USERNAME"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setDraft("");
              }}
              className="cursor-pointer rounded-[10px] border border-hair px-[22px] py-3 font-mono text-[11px] tracking-[0.14em] text-muted transition hover:border-primary hover:text-fg"
            >
              CANCEL
            </button>
          </div>
        </div>
      )}

      <ChangeWarning
        open={confirming}
        onOpenChange={setConfirming}
        from={current ?? ""}
        to={normalised}
        remaining={allowance?.changesRemaining ?? 0}
        permanentCode={user?.referralCode ?? ""}
        busy={busy}
        onConfirm={() => void save()}
      />
    </>
  );
}

/**
 * The confirmation.
 *
 * Deliberately concrete about what breaks. "Are you sure?" gets clicked
 * through; naming the old handle, saying that links carrying it will credit
 * nobody, and stating how many changes are left afterwards gives somebody the
 * facts to actually decide - and makes the one irreversible part of this screen
 * the part they read.
 */
function ChangeWarning({
  open,
  onOpenChange,
  from,
  to,
  remaining,
  permanentCode,
  busy,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  from: string;
  to: string;
  remaining: number;
  permanentCode: string;
  busy: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[400] bg-[color-mix(in_oklab,var(--bg)_74%,transparent)] [backdrop-filter:blur(16px)]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[401] w-[min(92vw,460px)] -translate-x-1/2 -translate-y-1/2 rounded-card border border-hair bg-surface p-[clamp(20px,4vw,28px)]">
          <Dialog.Title className="mb-3 font-display text-[22px] font-black uppercase leading-tight tracking-[-0.02em]">
            Your old links stop paying you
          </Dialog.Title>

          <Dialog.Description className="mb-4 text-[13px] leading-[1.65] text-muted">
            Anything already shared with{" "}
            <span className="font-mono text-fg">@{from}</span> - posts, messages,
            screenshots - will still open, but signups through them will credit nobody. The name is
            retired for good and cannot be taken by anyone else, including you.
          </Dialog.Description>

          <div className="mb-4 flex items-center gap-3 rounded-[11px] border border-hair bg-surface-2 px-4 py-3 font-mono text-[13px]">
            <span className="text-muted line-through">@{from}</span>
            <span className="text-muted">→</span>
            <span className="text-club">@{to}</span>
          </div>

          <p className="mb-5 text-[12px] leading-[1.6] text-muted">
            Your permanent code{" "}
            <span className="font-mono text-club">{permanentCode}</span> is unaffected and keeps
            working. After this you will have{" "}
            <strong className="text-fg">
              {remaining - 1} change{remaining - 1 === 1 ? "" : "s"}
            </strong>{" "}
            left.
          </p>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              disabled={busy}
              onClick={onConfirm}
              className="cursor-pointer rounded-[10px] bg-primary px-[22px] py-3 font-mono text-[11px] tracking-[0.14em] text-on-primary transition hover:brightness-[1.06] disabled:cursor-wait disabled:opacity-60"
            >
              {busy ? "CHANGING…" : "CHANGE IT"}
            </button>
            <Dialog.Close asChild>
              <button
                type="button"
                className="cursor-pointer rounded-[10px] border border-hair px-[22px] py-3 font-mono text-[11px] tracking-[0.14em] text-muted transition hover:text-fg"
              >
                KEEP @{from.toUpperCase()}
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
