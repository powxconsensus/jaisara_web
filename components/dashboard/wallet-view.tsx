"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { useWallet } from "@/components/wallet/use-wallet";
import { StatusPill } from "@/components/ui/status-pill";
import type { LedgerStatus } from "@/lib/data/wallet";
import { apiFetch } from "@/lib/api-fetch";

/**
 * The wallet.
 *
 * Every figure here is the member's own, read from the API. The previous
 * version rendered a fixed $184.50 with an invented ledger and greeted
 * everybody as "Rahul" - convincing in a design review and actively
 * misleading in the product.
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

export function WalletView() {
  const { user } = useAuth();
  const { wallet, loading } = useWallet();
  const [ledger, setLedger] = useState<LedgerRow[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void apiFetch("/api/wallet/history?take=25", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => (response.ok ? ((await response.json()) as LedgerRow[]) : []))
      .then((rows) => {
        if (!controller.signal.aborted) setLedger(rows);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLedger([]);
      });
    return () => controller.abort();
  }, []);

  const firstName = (user?.displayName ?? "").trim().split(/\s+/)[0];

  const tiles = [
    { label: "LIFETIME EARNED", value: wallet?.lifetimeUsd },
    { label: "FROM THE CLUB", value: wallet?.clubUsd },
  ];

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
        <Link
          href="/dashboard/claim"
          className="rounded-[10px] bg-primary px-5 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-on-primary transition hover:brightness-[1.06]"
        >
          Submit a claim
        </Link>
      </div>

      <div className="mb-4 grid gap-2.5 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="rounded-card border border-hair bg-surface p-[clamp(20px,3vw,26px)]">
          <p className="mb-3 font-mono text-[9.5px] tracking-[0.18em] text-muted">
            AVAILABLE TO WITHDRAW
          </p>
          <p data-count className="font-mono text-[clamp(30px,5vw,44px)] leading-none text-primary">
            {wallet ? `$${wallet.availableUsd}` : loading ? "-" : "$0.00"}
          </p>
          <p className="mt-3 font-mono text-[10px] tracking-[0.12em] text-muted">
            {wallet ? `$${wallet.pendingUsd} PENDING` : "PENDING -"}
            {wallet && !wallet.canWithdraw && (
              <> · MINIMUM ${wallet.minWithdrawalUsd} TO WITHDRAW</>
            )}
          </p>
          {wallet?.canWithdraw && (
            <Link
              href="/dashboard/withdraw"
              className="mt-5 inline-flex rounded-[10px] border border-hair px-4 py-2.5 font-mono text-[10px] tracking-[0.14em] text-primary transition hover:border-primary"
            >
              WITHDRAW
            </Link>
          )}
        </div>

        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="rounded-card border border-hair bg-surface p-[clamp(20px,3vw,26px)]"
          >
            <p className="mb-3 font-mono text-[9.5px] tracking-[0.18em] text-muted">
              {tile.label}
            </p>
            <p data-count className="font-mono text-[clamp(22px,3vw,30px)] leading-none">
              {tile.value ? `$${tile.value}` : "$0.00"}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-card border border-hair bg-surface px-5 pb-3 pt-1.5">
        <p className="border-b border-hair-soft py-4 font-mono text-[9.5px] tracking-[0.18em] text-muted">
          RECENT CASHBACK
        </p>

        {ledger === null ? (
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
