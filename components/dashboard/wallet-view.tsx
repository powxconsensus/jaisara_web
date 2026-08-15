"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/auth-context";
import { useWallet, refreshWallet, type WalletSummary } from "@/components/wallet/use-wallet";
import { StatusPill } from "@/components/ui/status-pill";
import { RefreshButton } from "@/components/ui/refresh-button";
import type { LedgerStatus } from "@/lib/data/wallet";
import { useResource } from "@/lib/resource";
import { conversionLabel, formatPoints } from "@/lib/points";
import { greetingName } from "@/lib/identity";
import { WithdrawalProgress } from "./withdrawal-progress";

/**
 * The wallet.
 *
 * Every figure here is the member's own, read from the API. The previous
 * version rendered a fixed $184.50 with an invented ledger and greeted
 * everybody as "Rahul" - convincing in a design review and actively
 * misleading in the product.
 *
 * The page answers three questions in order, because that is the order they
 * get asked: what can I take out, where is the rest of it, and what happened.
 */

interface LedgerRow {
  id: string;
  type: string;
  state: string;
  amountUsd: string;
  availableAt: string | null;
  createdAt: string;
  firm: string | null;
  plan: string | null;
  orderId: string | null;
}

/** Ledger state → the pill vocabulary the design already uses. */
function pillFor(state: string): LedgerStatus | "Approved" {
  if (state === "AVAILABLE" || state === "RELEASED") return "Approved";
  if (state === "REVERSED") return "Rejected";
  return "Pending";
}

export function WalletView({ pointsPerUsd }: { pointsPerUsd: number }) {
  const { user } = useAuth();
  const { wallet, loading } = useWallet();

  // Served from cache on a repeat visit; the balance above it is seeded by the
  // layout, so the whole page can paint without waiting on anything.
  const history = useResource<LedgerRow[]>("/api/wallet/history", { query: { take: 25 } });
  const ledger = history.data;

  /**
   * Both halves, because they are one question.
   *
   * The balance lives in its own store (the navbar shows it too, and a
   * withdrawal has to move every copy at once) while the ledger goes through
   * the resource cache. A member pressing refresh on the wallet means "tell me
   * what I have", not "tell me half of it", so the button drives both.
   */
  const refreshAll = () => {
    void refreshWallet();
    void history.reload();
  };

  // The handle when there is no name, so the greeting survives an account that
  // only ever set a username.
  const firstName = greetingName(user);

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-3.5 font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
            [ Wallet ]
          </p>
          <h1 className="m-0 font-display text-[clamp(25px,3.3vw,34px)] font-black uppercase leading-none tracking-[-0.02em]">
            {firstName ? (
              <>
                Good to see you,{" "}
                <span className="font-serif font-normal normal-case italic tracking-normal text-primary">
                  {firstName}
                </span>
              </>
            ) : (
              "Your wallet"
            )}
          </h1>
        </div>
        <div className="flex items-center gap-2.5">
          <RefreshButton
            onRefresh={refreshAll}
            refreshing={history.refreshing}
            fetchedAt={history.fetchedAt}
          />
          <Link
            href="/dashboard/claim"
            className="rounded-[10px] bg-primary px-5 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-on-primary transition hover:brightness-[1.06]"
          >
            Submit a claim
          </Link>
        </div>
      </div>

      {/* Stacked rather than the balance and the two tiles sharing a row.
          Beside a panel that carries a headline figure and a progress bar,
          the tiles were squeezed to about 200px - narrow enough that
          "LIFETIME EARNED" broke across two lines and its note ran to three.
          They are secondary figures; they read better given the full width
          below than starved of it alongside. */}
      <BalancePanel wallet={wallet} loading={loading} pointsPerUsd={pointsPerUsd} />

      {wallet && Number(wallet.holdPoints) > 0 && (
        <div className="mt-2.5">
          <HoldNote wallet={wallet} />
        </div>
      )}

      <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
        <Tile
          label="LIFETIME EARNED"
          value={wallet?.lifetimeUsd}
          points={wallet?.lifetimePoints}
          hint="Cashback and referrals, all time."
        />
        <Tile
          label="FROM THE CLUB"
          value={wallet?.clubUsd}
          points={wallet?.clubPoints}
          hint="Referral share, already counted in lifetime."
        />
      </div>

      <div className="mt-2.5 rounded-card border border-hair bg-surface px-5 pb-3 pt-1.5">
        <p className="border-b border-hair-soft py-4 font-mono text-[9.5px] tracking-[0.18em] text-muted">
          RECENT CASHBACK
        </p>

        {ledger === null && history.error ? (
          // Not an empty state. A failed read used to fall through to "No
          // cashback yet", which tells a member their earnings are gone.
          <div className="px-2.5 py-12 text-center">
            <p className="mb-2.5 font-mono text-[10px] tracking-[0.16em] text-warning">
              COULD NOT LOAD
            </p>
            <p className="mx-auto max-w-[44ch] text-[12.5px] leading-6 text-muted">
              {history.error} Your balance above is unaffected.
            </p>
          </div>
        ) : ledger === null ? (
          <div aria-busy className="space-y-2 py-3">
            {[0, 1, 2].map((row) => (
              <div key={row} className="h-[52px] animate-pulse rounded-[11px] bg-surface-2" />
            ))}
          </div>
        ) : ledger.length === 0 ? (
          <div className="px-2.5 py-12 text-center">
            <p className="mb-2.5 font-mono text-[10px] tracking-[0.16em] text-muted">EMPTY</p>
            <p className="mb-1.5 text-sm font-semibold">No cashback yet</p>
            <p className="mx-auto max-w-[44ch] text-[12.5px] leading-6 text-muted">
              Buy a challenge with a Jaisara coupon, then submit the receipt. Approved cashback
              lands here.
            </p>
          </div>
        ) : (
          ledger.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-hair-soft py-3.5 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {row.firm ?? row.type.replaceAll("_", " ")}
                  {row.plan && <span className="text-muted"> · {row.plan}</span>}
                </p>
                <p className="mt-1 font-mono text-[9.5px] tracking-[0.02em] text-muted">
                  {new Date(row.createdAt).toLocaleDateString()}
                  {row.availableAt && row.state === "PENDING" && (
                    <> · CLEARS {new Date(row.availableAt).toLocaleDateString()}</>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusPill status={pillFor(row.state)} />
                <span data-count className="font-mono text-[13.5px]">
                  {row.state === "REVERSED" ? "-" : `+$${row.amountUsd}`}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/** The headline balance, the threshold bar, and the way out. */
function BalancePanel({
  wallet,
  loading,
  pointsPerUsd,
}: {
  wallet: WalletSummary | null;
  loading: boolean;
  pointsPerUsd: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-card border border-hair bg-surface p-[clamp(20px,3vw,28px)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-24 size-[260px] rounded-full opacity-[0.12] blur-[70px]"
        style={{ background: "var(--primary)" }}
      />

      {/* Figure left, progress right on a wide panel. A single column here
          left the bar sitting under a very large number with a lot of empty
          panel beside it. */}
      <div className="relative grid items-center gap-x-[clamp(24px,4vw,56px)] gap-y-7 md:grid-cols-[minmax(0,auto)_minmax(0,1fr)]">
        <div>
          <p className="mb-3 font-mono text-[9.5px] tracking-[0.18em] text-muted">
            AVAILABLE TO WITHDRAW
          </p>
          <p
            data-count
            className="font-mono text-[clamp(34px,5.4vw,52px)] leading-none tracking-[-0.02em] text-primary"
          >
            {wallet ? `$${wallet.availableUsd}` : loading ? "-" : "$0.00"}
          </p>

          {/* The same balance in the unit the ledger actually keeps, with the
              rate beside it. Under the dollars rather than instead of them:
              dollars are what somebody is deciding about, points are what the
              number is. */}
          <p className="mt-2.5 font-mono text-[11px] tracking-[0.08em] text-muted">
            {formatPoints(wallet?.availablePoints ?? "0")} PTS
            <span className="mx-2 opacity-40">·</span>
            {conversionLabel(pointsPerUsd)}
          </p>

          {wallet?.canWithdraw && (
            <Link
              href="/dashboard/withdraw"
              className="mt-6 inline-flex items-center gap-2 rounded-[10px] bg-primary px-5 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-on-primary transition hover:brightness-[1.06]"
            >
              Withdraw<span className="text-sm">↗</span>
            </Link>
          )}
        </div>

        {wallet ? (
          <WithdrawalProgress wallet={wallet} />
        ) : (
          <div aria-busy className="h-[76px] animate-pulse rounded-[11px] bg-surface-2" />
        )}
      </div>
    </div>
  );
}

/**
 * Money the member has asked for that has not gone out yet.
 *
 * The debit happens the instant the request is accepted - that is what makes
 * asking twice for the same balance impossible - so without this the balance
 * simply drops and nothing in the product accounts for the difference. The
 * copy says where it went and why it is not spendable, in that order.
 */
function HoldNote({ wallet }: { wallet: WalletSummary }) {
  const many = wallet.holdCount !== 1;

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2.5 rounded-card border px-[clamp(18px,2.5vw,24px)] py-4"
      style={{
        borderColor: "color-mix(in oklab, var(--warning) 34%, transparent)",
        background: "color-mix(in oklab, var(--warning) 8%, transparent)",
      }}
    >
      <div className="flex items-baseline gap-3">
        <span data-count className="font-mono text-[21px] leading-none text-warning">
          ${wallet.holdUsd}
        </span>
        <span className="font-mono text-[9.5px] tracking-[0.16em] text-muted">
          ON HOLD · {wallet.holdCount} PAYOUT{many ? "S" : ""} IN PROGRESS
        </span>
      </div>
      <p className="max-w-[52ch] text-[12px] leading-[1.6] text-muted">
        This left your available balance the moment you requested it, so it cannot be spent twice.
        It arrives once the payout is sent, or comes back if it cannot be.
      </p>
      <Link
        href="/dashboard/withdraw"
        className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary hover:underline"
      >
        Payout history ↗
      </Link>
    </div>
  );
}

function Tile({
  label,
  value,
  points,
  hint,
}: {
  label: string;
  value?: string;
  points?: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col rounded-card border border-hair bg-surface p-[clamp(20px,3vw,26px)]">
      <p className="mb-3 font-mono text-[9.5px] tracking-[0.18em] text-muted">{label}</p>
      <p data-count className="font-mono text-[clamp(22px,3vw,30px)] leading-none">
        {value ? `$${value}` : "$0.00"}
      </p>
      {/* The rate is stated once, on the headline balance. Repeating it on
          every tile would crowd four copies of one fact onto the page. */}
      <p className="mt-2 font-mono text-[10px] tracking-[0.08em] text-muted">
        {formatPoints(points ?? "0")} PTS
      </p>
      {hint && <p className="mt-auto pt-3 text-[11px] leading-[1.5] text-muted">{hint}</p>}
    </div>
  );
}

