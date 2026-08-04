import type { Metadata } from "next";
import Link from "next/link";
import { money } from "@/lib/format";
import { LEDGER, WALLET } from "@/lib/data/wallet";
import { StatusPill } from "@/components/ui/status-pill";

export const metadata: Metadata = { title: "Wallet" };

/**
 * The wallet (handoff §4.5): balance card, submit-a-claim CTA and the recent
 * cashback ledger. Nothing else — appearance settings live on their own screen.
 */
export default function WalletPage() {
  return (
    <div>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-3.5 font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
            [ Wallet ]
          </p>
          <h1 className="m-0 font-display text-[clamp(25px,3.3vw,34px)] font-black uppercase leading-none tracking-[-0.02em]">
            Good morning,{" "}
            <span className="font-serif font-normal normal-case italic tracking-normal text-primary">
              Rahul
            </span>
          </h1>
        </div>
        <Link
          href="/dashboard/claim"
          className="rounded-[11px] bg-primary px-5 py-[13px] font-mono text-[10.5px] font-semibold uppercase tracking-[0.15em] text-on-primary transition hover:-translate-y-px hover:brightness-[1.08]"
        >
          Submit a claim
        </Link>
      </div>

      <section className="relative mb-3.5 rounded-[18px] border border-hair bg-surface p-[clamp(24px,3vw,32px)]">
        <div className="grid items-center gap-7 md:grid-cols-2">
          <div>
            <h2 className="mb-3.5 font-mono text-[9.5px] tracking-[0.22em] text-muted">
              AVAILABLE BALANCE
            </h2>
            <p
              data-count
              className="font-mono text-[clamp(36px,5vw,50px)] font-medium leading-none tracking-[-0.045em]"
            >
              {money(WALLET.available)}
            </p>
            <p className="mt-[13px] flex items-center gap-2.5">
              <span className="size-1.5 rounded-[2px] bg-warning" />
              <span className="font-mono text-[10.5px] tracking-[0.06em] text-muted">
                {money(WALLET.pending)} PENDING / CLEARS IN 30D
              </span>
            </p>
          </div>

          <dl className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3 border-b border-hair-soft pb-3">
              <dt className="text-[13px] text-muted">Lifetime earned</dt>
              <dd data-count className="font-mono text-base">
                {money(WALLET.lifetime)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-b border-hair-soft pb-3">
              <dt className="text-[13px] text-muted">From the Club</dt>
              <dd data-count className="font-mono text-base text-club">
                {money(WALLET.fromClub)}
              </dd>
            </div>
            <Link
              href="/dashboard/withdraw"
              className="rounded-[10px] border border-hair p-[13px] text-center font-mono text-[10.5px] font-semibold uppercase tracking-[0.15em] transition hover:border-primary"
            >
              Withdraw
            </Link>
          </dl>
        </div>
      </section>

      <section className="rounded-[18px] border border-hair bg-surface p-[clamp(20px,3vw,28px)]">
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <h2 className="font-mono text-[9.5px] tracking-[0.22em] text-muted">RECENT CASHBACK</h2>
          <span className="font-mono text-[9.5px] tracking-[0.12em] text-muted">VIEW ALL</span>
        </div>

        <ul>
          {/* Three columns on phones (the pill drops under the amount), four
              from tablet up so the pill and amount never share a cell. */}
          {LEDGER.map((row) => (
            <li
              key={`${row.firm}-${row.date}`}
              className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-x-[13px] gap-y-[5px] border-b border-hair-soft py-3.5 md:grid-cols-[36px_minmax(0,1fr)_auto_auto]"
            >
              <span className="col-start-1 row-span-2 row-start-1 grid size-9 place-items-center rounded-[10px] bg-surface-2 font-mono text-[10px] text-muted">
                {row.mark}
              </span>
              <p className="col-start-2 row-start-1 min-w-0 truncate text-sm font-medium">
                {row.firm}
              </p>
              <p className="col-start-2 row-start-2 min-w-0 truncate font-mono text-[9.5px] tracking-[0.04em] text-muted">
                {row.plan} / {row.date}
              </p>
              <span className="col-start-3 row-start-2 justify-self-end md:row-span-2 md:row-start-1 md:justify-self-start">
                <StatusPill status={row.status} />
              </span>
              <span
                data-count
                className="col-start-3 row-start-1 justify-self-end font-mono text-sm md:col-start-4 md:row-span-2"
                style={{ color: row.status === "Rejected" ? "var(--text-muted)" : undefined }}
              >
                {row.status === "Rejected" ? "—" : `+${money(row.amount)}`}
              </span>
            </li>
          ))}
        </ul>

        <p className="pt-4 text-xs leading-[1.6] text-muted">
          Pending amounts become available once the firm&rsquo;s refund window closes.
        </p>
      </section>
    </div>
  );
}
