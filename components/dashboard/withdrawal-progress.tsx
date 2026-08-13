import type { WalletSummary } from "@/components/wallet/use-wallet";

/**
 * Progress toward the withdrawal minimum.
 *
 * The threshold used to be a sentence in small print - "MINIMUM $10.00 TO
 * WITHDRAW" - which tells a member with $4.20 that they cannot cash out, but
 * not how far off they are, and says nothing at all about the $6 of pending
 * cashback that is going to clear the bar for them next week.
 *
 * ── The scale ─────────────────────────────────────────────────────────────
 * The end of the track *is* the minimum. Nothing is drawn past it and there is
 * no marker, because a bar whose end means something else needs a legend.
 *
 * The first version scaled the track to `max(minimum, available + pending)` and
 * put a tick where the threshold fell, which is more information and worse:
 * with $4.20 available and $6.00 pending the tick landed at 98%, invisible
 * against the right edge, and the same bar meant a different amount from one
 * visit to the next. This answers one question - am I there yet - and the
 * exact figures are on either side of it.
 *
 * ── The one rule ──────────────────────────────────────────────────────────
 * Pending is never counted as available, in the bar or in the copy. It is
 * shown *next to* available and hatched rather than solid, because a refund
 * inside the hold window takes it away again. A progress bar that fills itself
 * with money the member might not get is a promise the ledger has not made.
 *
 * No money arithmetic happens here. Every figure is a preformatted string from
 * the API; points are used only for the two width percentages.
 */

/**
 * Points are integers and always well inside `Number.MAX_SAFE_INTEGER` at any
 * plausible balance - and this only produces CSS percentages, which are floats
 * regardless. BigInt would buy nothing.
 */
function points(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function WithdrawalProgress({ wallet }: { wallet: WalletSummary }) {
  const available = points(wallet.availablePoints);
  const pending = points(wallet.pendingPoints);
  // `|| 1` keeps the division safe if the threshold is ever configured to
  // zero, in which case everything is withdrawable and the bar reads full.
  const minimum = points(wallet.minWithdrawalPoints) || 1;

  const availablePct = Math.min(100, (available / minimum) * 100);
  const pendingPct = Math.min(100 - availablePct, (pending / minimum) * 100);

  const ready = wallet.canWithdraw;
  const pendingCoversIt = !ready && points(wallet.pendingPoints) >= minimum - available;

  return (
    <div>
      <div className="mb-2.5 flex items-end justify-between gap-4">
        <p className="font-mono text-[9.5px] tracking-[0.18em] text-muted">
          {ready ? "READY TO WITHDRAW" : "PROGRESS TO THE MINIMUM"}
        </p>
        <p className="font-mono text-[9.5px] tracking-[0.14em] text-muted">
          MIN ${wallet.minWithdrawalUsd}
        </p>
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(availablePct)}
        aria-label={`$${wallet.availableUsd} available of the $${wallet.minWithdrawalUsd} withdrawal minimum`}
        className="relative h-2.5 w-full overflow-hidden rounded-full bg-surface-2"
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-700 ease-[cubic-bezier(.2,.8,.2,1)]"
          style={{ width: `${availablePct}%` }}
        />
        {/* Pending, hatched so it can never be mistaken for spendable. */}
        {pendingPct > 0 && (
          <div
            className="absolute inset-y-0 transition-[left,width] duration-700 ease-[cubic-bezier(.2,.8,.2,1)]"
            style={{
              left: `${availablePct}%`,
              width: `${pendingPct}%`,
              backgroundImage:
                "repeating-linear-gradient(115deg, color-mix(in oklab, var(--primary) 45%, transparent) 0 4px, transparent 4px 8px)",
            }}
          />
        )}
      </div>

      <p className="mt-3 text-[12.5px] leading-[1.6] text-muted">
        {ready ? (
          <>
            <span className="font-medium text-fg">${wallet.availableUsd}</span> is clear and ready
            to send.
          </>
        ) : (
          <>
            <span className="font-medium text-fg">${wallet.shortfallUsd} to go</span> before you can
            withdraw.
            {pendingCoversIt ? (
              <> Your ${wallet.pendingUsd} pending covers it once the hold period ends.</>
            ) : pending > 0 ? (
              <> ${wallet.pendingUsd} is pending and counts once it clears.</>
            ) : null}
          </>
        )}
      </p>
    </div>
  );
}
