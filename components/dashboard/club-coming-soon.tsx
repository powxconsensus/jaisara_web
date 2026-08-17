import Link from "next/link";

/**
 * The Club, switched off from the console.
 *
 * Modelled on the copytrading page rather than invented: a member who has seen
 * one recognises the other as "announced, not ready" instead of "broken".
 *
 * What it deliberately does not do is pretend the club does not exist. The
 * navigation still lists it, the tier names are still real, and referrals are
 * still being counted - so the honest thing is to say it is not open yet, not
 * to hide it and have somebody find their old invite link still working.
 */
export function ClubComingSoon() {
  return (
    <div className="max-w-[720px]">
      <p className="mb-3.5 font-mono text-[10px] uppercase tracking-[0.24em] text-club">
        [ Coming soon ]
      </p>
      <h1 className="mb-3.5 font-display text-[clamp(28px,4vw,44px)] font-black uppercase leading-[0.98] tracking-[-0.025em]">
        Bring a friend,{" "}
        <span className="font-serif font-normal normal-case italic tracking-normal text-club">
          earn together.
        </span>
      </h1>
      <p className="mb-7 max-w-[52ch] text-[15px] leading-[1.68] text-muted">
        Jaisara Club pays you a share when someone you invited buys a challenge - without taking
        anything from what they earn. We are finishing it before we open it.
      </p>

      <div className="rounded-card border border-hair bg-surface p-[clamp(18px,3vw,26px)]">
        <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
          In the meantime
        </p>
        <p className="mb-4 text-[13px] leading-[1.65] text-muted">
          Cashback on your own purchases is unaffected and works today. Submit a receipt and it
          lands in the same wallet the Club will pay into.
        </p>
        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/dashboard/claim"
            className="rounded-[10px] bg-primary px-5 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-on-primary transition hover:brightness-[1.06]"
          >
            Submit a claim
          </Link>
          <Link
            href="/deals"
            className="rounded-[10px] border border-hair px-5 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted transition hover:text-fg"
          >
            Browse firms
          </Link>
        </div>
      </div>
    </div>
  );
}
