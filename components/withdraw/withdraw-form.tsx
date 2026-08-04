"use client";

import { useEffect, useRef, useState } from "react";
import { money } from "@/lib/format";
import { WALLET } from "@/lib/data/wallet";
import { CHAINS, GIFT_CARDS, MIN_WITHDRAWAL } from "@/lib/data/payouts";
import { useToast } from "@/components/shell/toast";
import { cn } from "@/lib/cn";

type Method = "usdt" | "giftcard";

const DENOMINATIONS = [25, 50, 100, 200];

interface Payout {
  method: string;
  amount: number;
}

/**
 * Withdraw (handoff §4.8).
 *
 * Method is a compact grid beside the amount, not a stacked card list — that
 * made the panel very tall. For USDT the chain selector sits to the LEFT of
 * the address input, sharing one bordered row as a prefix dropdown.
 */
export function WithdrawForm() {
  const { toast } = useToast();
  const [amount, setAmount] = useState(WALLET.available.toFixed(2));
  const [method, setMethod] = useState<Method>("usdt");
  const [chain, setChain] = useState(CHAINS[0]);
  const [chainOpen, setChainOpen] = useState(false);
  const [brand, setBrand] = useState(GIFT_CARDS[0].key);
  const [denomination, setDenomination] = useState(DENOMINATIONS[0]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const chainWrapRef = useRef<HTMLDivElement>(null);

  // Dismiss on pointerdown + contains(), never a blanket document click.
  useEffect(() => {
    if (!chainOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!chainWrapRef.current?.contains(event.target as Node)) setChainOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [chainOpen]);

  const value = Number.parseFloat(amount);
  const error =
    Number.isFinite(value) && value < MIN_WITHDRAWAL
      ? `Minimum withdrawal is ${money(MIN_WITHDRAWAL)}.`
      : Number.isFinite(value) && value > WALLET.available
        ? `That is more than your available balance of ${money(WALLET.available)}.`
        : null;

  const request = () => {
    if (error || !Number.isFinite(value)) return;
    setPayouts((prev) => [
      { method: method === "usdt" ? `USDT · ${chain.name}` : "Gift card", amount: value },
      ...prev,
    ]);
    toast("Payout requested — sent within 24 hours");
  };

  return (
    <div className="max-w-[620px]">
      <div className="rounded-[18px] border border-hair bg-surface p-[clamp(22px,3vw,30px)]">
        <div className="mb-5 flex items-end justify-between gap-4 border-b border-hair-soft pb-5">
          <div>
            <p className="mb-2.5 font-mono text-[9.5px] tracking-[0.22em] text-muted">AVAILABLE</p>
            <p data-count className="font-mono text-[32px] leading-none tracking-[-0.03em]">
              {money(WALLET.available)}
            </p>
          </div>
          <p className="text-right font-mono text-[9.5px] leading-[1.6] tracking-[0.06em] text-muted">
            MIN {money(MIN_WITHDRAWAL)}
            <br />
            NO FEE ON TRC-20
          </p>
        </div>

        <p className="mb-2 font-mono text-[9px] tracking-[0.16em] text-muted">AMOUNT</p>
        <div className="mb-[18px] flex gap-2.5">
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            inputMode="decimal"
            aria-label="Withdrawal amount"
            aria-invalid={Boolean(error)}
            className="flex-1 rounded-[11px] border border-hair bg-surface-2 px-4 py-3.5 font-mono text-base tabular-nums outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={() => setAmount(WALLET.available.toFixed(2))}
            className="flex cursor-pointer items-center rounded-[11px] border border-hair px-[18px] font-mono text-[10.5px] font-semibold tracking-[0.12em] transition hover:border-primary"
          >
            MAX
          </button>
        </div>
        {error && <p className="mb-3 text-[12.5px] text-danger">{error}</p>}

        <div className="mb-2.5 flex items-center justify-between gap-3">
          <span className="font-mono text-[9px] tracking-[0.16em] text-muted">METHOD</span>
          <span className="font-mono text-[9px] tracking-[0.06em] text-muted">
            {method === "usdt" ? "Sent within 24h" : "Codes emailed in 24h"}
          </span>
        </div>
        <div className="mb-3.5 grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(152px,1fr))]">
          {(
            [
              { key: "usdt", mark: "USDT", label: "USDT crypto" },
              { key: "giftcard", mark: "GIFT", label: "Gift card" },
            ] as const
          ).map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setMethod(option.key)}
              aria-pressed={method === option.key}
              className={cn(
                "flex min-w-0 cursor-pointer items-center gap-2.5 rounded-[11px] border-[1.5px] px-3 py-[11px] transition-all",
                method === option.key
                  ? "border-primary bg-[color-mix(in_oklab,var(--primary)_10%,transparent)]"
                  : "border-hair hover:border-primary",
              )}
            >
              <span className="grid size-[26px] flex-none place-items-center rounded-[7px] bg-surface font-mono text-[8px] text-muted">
                {option.mark}
              </span>
              <span className="truncate text-[12.5px] font-semibold">{option.label}</span>
            </button>
          ))}
        </div>

        {method === "usdt" ? (
          <div ref={chainWrapRef} className="relative mb-[18px] [animation:jsUp_.3s_both]">
            {/* Chain prefix and address share one bordered row. */}
            <div className="flex items-stretch rounded-[11px] border border-hair bg-surface-2">
              <button
                type="button"
                onClick={() => setChainOpen((v) => !v)}
                aria-expanded={chainOpen}
                className="flex flex-none cursor-pointer items-center gap-2.5 rounded-l-[11px] border-r border-hair-soft px-[13px] transition hover:bg-surface"
              >
                <span className="grid size-5 place-items-center rounded-md bg-surface font-mono text-[7px] text-muted">
                  {chain.mark}
                </span>
                <span className="whitespace-nowrap font-mono text-[11.5px] font-semibold tracking-[0.06em]">
                  {chain.name}
                </span>
                <span
                  aria-hidden="true"
                  className="text-[8px] text-muted transition-transform duration-[250ms]"
                  style={{ transform: chainOpen ? "rotate(180deg)" : "none" }}
                >
                  ▼
                </span>
              </button>
              <input
                placeholder={chain.placeholder}
                aria-label="Wallet address"
                className="min-w-0 flex-1 border-none bg-transparent px-[15px] py-[13px] font-mono text-[13px] outline-none"
              />
            </div>

            {chainOpen && (
              <div className="absolute left-0 top-[calc(100%+8px)] z-[120] w-[250px] rounded-[13px] border border-hair bg-surface p-1.5 shadow-card [animation:jsUp_.22s_both]">
                {CHAINS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => {
                      setChain(option);
                      setChainOpen(false);
                    }}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-[11px] rounded-[9px] px-2.5 py-2.5 text-left transition-colors hover:bg-surface-2",
                      option.key === chain.key && "bg-surface-2",
                    )}
                  >
                    <span className="grid size-[22px] flex-none place-items-center rounded-md bg-surface-2 font-mono text-[7px] text-muted">
                      {option.mark}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-xs font-semibold tracking-[0.04em]">
                        {option.name}
                      </span>
                      <span className="mt-px block text-[10.5px] text-muted">{option.note}</span>
                    </span>
                    {option.key === chain.key && (
                      <span className="size-[5px] flex-none rounded-[2px] bg-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="mb-[18px] [animation:jsUp_.3s_both]">
            <div className="mb-2.5 flex flex-wrap gap-[7px]">
              {GIFT_CARDS.map((card) => (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => setBrand(card.key)}
                  aria-pressed={brand === card.key}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-[10px] border py-2 pl-2 pr-3 transition-all",
                    brand === card.key
                      ? "border-primary bg-[color-mix(in_oklab,var(--primary)_10%,transparent)]"
                      : "border-hair hover:border-primary",
                  )}
                >
                  <span className="grid size-[22px] place-items-center rounded-md bg-surface font-mono text-[7px] text-muted">
                    {card.mark}
                  </span>
                  <span className="text-[12.5px] font-medium">{card.name}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-[7px]">
              {DENOMINATIONS.map((denom) => (
                <button
                  key={denom}
                  type="button"
                  onClick={() => setDenomination(denom)}
                  aria-pressed={denomination === denom}
                  className={cn(
                    "cursor-pointer rounded-[9px] border px-3.5 py-2.5 font-mono text-xs transition-all",
                    denomination === denom
                      ? "border-primary bg-[color-mix(in_oklab,var(--primary)_14%,transparent)] text-fg"
                      : "border-hair text-muted hover:border-primary",
                  )}
                >
                  ${denom}
                </button>
              ))}
              <span className="ml-1 font-mono text-[9px] tracking-[0.06em] text-muted">
                EMAILED WITHIN 24H / +5% BONUS
              </span>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={request}
          disabled={Boolean(error) || !Number.isFinite(value)}
          className="w-full cursor-pointer rounded-[11px] bg-primary p-[15px] text-center font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] text-on-primary transition hover:-translate-y-px hover:brightness-[1.08] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
        >
          Request payout
        </button>
      </div>

      <section className="mt-3.5 rounded-card border border-hair bg-surface p-[clamp(20px,3vw,26px)]">
        <h2 className="mb-2 font-mono text-[9.5px] tracking-[0.22em] text-muted">PAYOUT HISTORY</h2>
        {payouts.length === 0 ? (
          <div className="px-2.5 py-[30px] text-center">
            <p className="mb-2.5 font-mono text-[10px] tracking-[0.16em] text-muted">EMPTY</p>
            <p className="mb-1.5 text-sm font-semibold">No payouts yet</p>
            <p className="text-[12.5px] text-muted">Your first withdrawal will appear here.</p>
          </div>
        ) : (
          payouts.map((payout, i) => (
            <div key={i} className="flex items-center gap-3.5 border-b border-hair-soft py-[15px]">
              <span className="grid size-8 flex-none place-items-center rounded-[9px] bg-surface-2 font-mono text-[8px] text-muted">
                PAY
              </span>
              <div className="flex-1">
                <p className="text-[13.5px] font-medium">{payout.method}</p>
                <p className="mt-0.5 text-[11.5px] text-muted">Just now</p>
              </div>
              <span
                className="rounded-md px-[9px] py-[5px] font-mono text-[8.5px] tracking-[0.12em] text-warning"
                style={{ background: "color-mix(in oklab, var(--warning) 16%, transparent)" }}
              >
                PROCESSING
              </span>
              <span data-count className="font-mono text-[13.5px]">
                {money(payout.amount)}
              </span>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
