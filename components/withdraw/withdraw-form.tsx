"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CHAINS } from "@/lib/data/payouts";
import { useToast } from "@/components/shell/toast";
import { refreshWallet, useWallet } from "@/components/wallet/use-wallet";
import { cn } from "@/lib/cn";
import { apiErrorMessage } from "@/lib/auth-types";
import { apiFetch } from "@/lib/api-fetch";

type Method = "usdt" | "giftcard";

/**
 * Withdraw (handoff §4.8).
 *
 * Every figure and every option here is the member's own: the balance, the
 * minimum, the saved addresses and the reward catalogue. The form used to be a
 * convincing mock that pushed a row into local state and toasted "payout
 * requested" - the one screen in the product where that is least acceptable.
 *
 * Addresses carry a cooldown before first use. That is not an inconvenience to
 * hide: changing where money goes is the classic account-takeover payday, so
 * the wait is surfaced with the reason attached.
 */

interface PayoutAddress {
  id: string;
  chain: string;
  address: string;
  label: string | null;
  usableFrom: string;
}

interface RewardItem {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  category: string | null;
  priceUsd: string;
  inStock: boolean;
}

interface Withdrawal {
  id: string;
  status: string;
  kind: string;
  amountUsd?: string;
  grossAmountUsd?: string;
  feeUsd?: string;
  netAmountUsd?: string;
  requestedAt: string;
  externalTxId?: string | null;
  payoutAddress?: { chain: string; address: string } | null;
  rewardItem?: { name: string; brand: string | null } | null;
}

interface PublicPayoutConfig {
  environment: "TESTNET" | "MAINNET";
  autoPayEnabled: boolean;
  autoPayMaxPoints: string;
  autoPayMaxUsd: string;
  autoPayKycRequired: boolean;
  dailyWithdrawalRequestLimit: number;
  dailyLimitWindow: "ROLLING_24_HOURS" | "UTC_DAY";
  pointsPerUsd: number;
  minWithdrawalPoints: string;
  minWithdrawalUsd: string;
  networks: Array<{
    chain: "TRC20" | "POLYGON" | "ARBITRUM";
    enabled: boolean;
    feeUsdt: string;
  }>;
}

const STATUS_TONE: Record<string, string> = {
  REQUESTED: "var(--warning)",
  APPROVED: "var(--info)",
  PROCESSING: "var(--info)",
  PAID: "var(--success)",
  FAILED: "var(--danger)",
  CANCELLED: "var(--text-muted)",
};

export function WithdrawForm() {
  const { toast } = useToast();
  const { wallet } = useWallet();

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Method>("usdt");
  const [chain, setChain] = useState(CHAINS[0]);
  const [chainOpen, setChainOpen] = useState(false);
  const [addresses, setAddresses] = useState<PayoutAddress[]>([]);
  const [addressId, setAddressId] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [rewardId, setRewardId] = useState("");
  const [history, setHistory] = useState<Withdrawal[]>([]);
  const [payoutConfig, setPayoutConfig] = useState<PublicPayoutConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The clock, in state. Reading `Date.now()` while rendering makes the output
  // depend on when React happened to render; keeping it here also means a
  // cooldown visibly expires instead of waiting for a reload.
  const [now, setNow] = useState(0);
  const chainWrapRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const [addressRes, rewardRes, historyRes, configRes] = await Promise.all([
      apiFetch("/api/payouts/addresses", { cache: "no-store" }),
      apiFetch("/api/payouts/rewards", { cache: "no-store" }),
      apiFetch("/api/payouts/withdrawals", { cache: "no-store" }),
      apiFetch("/api/payouts/config", { cache: "no-store" }),
    ]);

    if (addressRes.ok) setAddresses((await addressRes.json()) as PayoutAddress[]);
    if (rewardRes.ok) setRewards((await rewardRes.json()) as RewardItem[]);
    if (historyRes.ok) setHistory((await historyRes.json()) as Withdrawal[]);
    if (configRes.ok) {
      const next = (await configRes.json()) as PublicPayoutConfig;
      setPayoutConfig(next);
      const enabled = new Set(next.networks.filter((entry) => entry.enabled).map((entry) => entry.chain));
      setChain((current) =>
        enabled.has(current.enumValue)
          ? current
          : (CHAINS.find((entry) => enabled.has(entry.enumValue)) ?? current),
      );
    }
    setNow(Date.now());
  }, []);

  useEffect(() => {
    // Every setState reached from `load` is behind an await; the rule cannot
    // see through the call and flags it as a synchronous update.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().catch(() => setError("Your payout options could not be loaded."));
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  // Dismiss on pointerdown + contains(), never a blanket document click.
  useEffect(() => {
    if (!chainOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!chainWrapRef.current?.contains(event.target as Node)) setChainOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [chainOpen]);

  const available = Number(wallet?.availableUsd ?? 0);
  const minimum = Number(wallet?.minWithdrawalUsd ?? 0);
  const value = Number.parseFloat(amount);
  const selectedAddress = addresses.find((entry) => entry.id === addressId);
  const enabledChains = CHAINS.filter((entry) =>
    payoutConfig?.networks.some(
      (network) => network.chain === entry.enumValue && network.enabled,
    ),
  );
  const selectedNetwork = selectedAddress
    ? payoutConfig?.networks.find((entry) => entry.chain === selectedAddress.chain)
    : undefined;
  const selectedFee = Number(selectedNetwork?.feeUsdt ?? 0);
  const netAmount = Number.isFinite(value) ? Math.max(0, value - selectedFee) : 0;
  const autoPayMax = Number(payoutConfig?.autoPayMaxUsd ?? 0);
  const autoEligible = Boolean(
    payoutConfig?.autoPayEnabled && Number.isFinite(value) && netAmount <= autoPayMax,
  );
  const addressLocked = selectedAddress
    ? new Date(selectedAddress.usableFrom).getTime() > now
    : false;

  const amountError =
    amount && Number.isFinite(value) && value < minimum
      ? `Minimum withdrawal is $${minimum.toFixed(2)}.`
      : amount && Number.isFinite(value) && value > available
        ? `That is more than your available balance of $${available.toFixed(2)}.`
        : amount && Number.isFinite(value) && value <= selectedFee
          ? `The amount must be greater than the $${selectedFee.toFixed(2)} network fee.`
        : null;

  const canSubmit =
    !busy &&
    !amountError &&
    (method === "giftcard"
      ? Boolean(rewardId)
      : Boolean(payoutConfig) &&
        selectedNetwork?.enabled === true &&
        Number.isFinite(value) &&
        value > 0 &&
        Boolean(addressId) &&
        !addressLocked);

  const addAddress = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await apiFetch("/api/payouts/addresses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chain: chain.enumValue, address: newAddress.trim() }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(apiErrorMessage(body, "That address could not be saved."));
        return;
      }
      setNewAddress("");
      toast("Address saved. There is a short cooldown before it can be used.", "info");
      await load();
    } catch {
      setError("The payout service is unavailable. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const request = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const response = await apiFetch("/api/payouts/withdraw", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          method: method === "usdt" ? "USDT" : "GIFT_CARD",
          // Points are the API's integer unit. The conversion rate is runtime
          // configuration, so the browser must not assume 100 points = $1.
          ...(method === "usdt"
            ? {
                points: String(Math.round(value * (payoutConfig?.pointsPerUsd ?? 0))),
                payoutAddressId: addressId,
              }
            : { rewardItemId: rewardId }),
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(apiErrorMessage(body, "That payout could not be requested."));
        return;
      }
      setAmount("");
      toast("Payout requested.", "success");
      // The balance was debited server-side the moment this succeeded, so
      // every surface showing it is now wrong until it re-reads - including
      // the figure in the navbar.
      await Promise.all([load(), refreshWallet()]);
    } catch {
      setError("The payout service is unavailable. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-[620px]">
      <div className="rounded-[18px] border border-hair bg-surface p-[clamp(22px,3vw,30px)]">
        <div className="mb-5 flex items-end justify-between gap-4 border-b border-hair-soft pb-5">
          <div>
            <p className="mb-2.5 font-mono text-[9.5px] tracking-[0.22em] text-muted">AVAILABLE</p>
            <p data-count className="font-mono text-[32px] leading-none tracking-[-0.03em]">
              ${wallet?.availableUsd ?? "0.00"}
            </p>
          </div>
          <p className="text-right font-mono text-[9.5px] leading-[1.6] tracking-[0.06em] text-muted">
            MIN ${wallet?.minWithdrawalUsd ?? "-"}
            <br />
            FEE SHOWN BEFORE SUBMIT
          </p>
        </div>

        {method === "usdt" && (
          <>
            <p className="mb-2 font-mono text-[9px] tracking-[0.16em] text-muted">AMOUNT</p>
            <div className="mb-[18px] flex gap-2.5">
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                inputMode="decimal"
                placeholder="0.00"
                aria-label="Withdrawal amount"
                aria-invalid={Boolean(amountError)}
                className="flex-1 rounded-[11px] border border-hair bg-surface-2 px-4 py-3.5 font-mono text-base tabular-nums outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => setAmount(available.toFixed(2))}
                className="flex cursor-pointer items-center rounded-[11px] border border-hair px-[18px] font-mono text-[10.5px] font-semibold tracking-[0.12em] transition hover:border-primary"
              >
                MAX
              </button>
            </div>
            {amountError && <p className="mb-3 text-[12.5px] text-danger">{amountError}</p>}
            {Number.isFinite(value) && value > 0 && selectedAddress && (
              <div className="mb-[18px] grid grid-cols-3 gap-2 rounded-[11px] border border-hair bg-surface-2 p-3 font-mono text-[10px]">
                <span>
                  <span className="block text-muted">GROSS</span>
                  <strong className="mt-1 block text-[12px] text-fg">${value.toFixed(2)}</strong>
                </span>
                <span>
                  <span className="block text-muted">{selectedAddress.chain} FEE</span>
                  <strong className="mt-1 block text-[12px] text-warning">-${selectedFee.toFixed(2)}</strong>
                </span>
                <span>
                  <span className="block text-muted">YOU RECEIVE</span>
                  <strong className="mt-1 block text-[12px] text-success">${netAmount.toFixed(2)}</strong>
                </span>
                <span className="col-span-3 border-t border-hair-soft pt-2 text-muted">
                  {autoEligible
                    ? `Within the automatic transfer limit of $${autoPayMax.toFixed(2)} after fees${payoutConfig?.autoPayKycRequired ? "; KYC approval is also required" : ""}.`
                    : payoutConfig?.autoPayEnabled
                      ? `Requires admin payment because the amount sent after fees exceeds $${autoPayMax.toFixed(2)}.`
                      : "Requires admin review and payment."}
                  {payoutConfig?.environment === "TESTNET" ? " Testnet mode is active." : ""}
                  {payoutConfig
                    ? ` Up to ${payoutConfig.dailyWithdrawalRequestLimit} request${payoutConfig.dailyWithdrawalRequestLimit === 1 ? "" : "s"} ${payoutConfig.dailyLimitWindow === "UTC_DAY" ? "per UTC day" : "in any 24-hour window"}.`
                    : ""}
                </span>
              </div>
            )}
          </>
        )}

        <div className="mb-2.5 flex items-center justify-between gap-3">
          <span className="font-mono text-[9px] tracking-[0.16em] text-muted">METHOD</span>
          <span className="font-mono text-[9px] tracking-[0.06em] text-muted">
            {method === "usdt" ? "USDT only" : "Available inventory only"}
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
          <div className="mb-[18px] [animation:jsUp_.3s_both]">
            {addresses.length > 0 && (
              <div className="mb-2.5 flex flex-col gap-1.5">
                {addresses
                  .filter((entry) =>
                    payoutConfig?.networks.some(
                      (network) => network.chain === entry.chain && network.enabled,
                    ),
                  )
                  .map((entry) => {
                  const locked = new Date(entry.usableFrom).getTime() > now;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => setAddressId(entry.id)}
                      aria-pressed={addressId === entry.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-2.5 rounded-[11px] border px-3 py-2.5 text-left transition",
                        addressId === entry.id
                          ? "border-primary bg-[color-mix(in_oklab,var(--primary)_10%,transparent)]"
                          : "border-hair hover:border-primary",
                      )}
                    >
                      <span className="grid size-[22px] flex-none place-items-center rounded-md bg-surface font-mono text-[7px] text-muted">
                        {entry.chain.slice(0, 3)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-mono text-[11.5px]">
                          {entry.address}
                        </span>
                        <span className="mt-px block text-[10.5px] text-muted">
                          {entry.label ?? entry.chain}
                        </span>
                      </span>
                      {locked && (
                        <span
                          className="flex-none rounded-md px-2 py-1 font-mono text-[8px] tracking-[0.12em] text-warning"
                          style={{
                            background: "color-mix(in oklab, var(--warning) 16%, transparent)",
                          }}
                        >
                          COOLING DOWN
                        </span>
                      )}
                    </button>
                  );
                  })}
              </div>
            )}

            {addressLocked && (
              <p className="mb-2.5 text-[11.5px] leading-5 text-warning">
                This address was added recently and cannot be used yet. New addresses wait out a
                short cooldown - it is what stops a stolen session from redirecting a payout
                before you notice.
              </p>
            )}

            <div ref={chainWrapRef} className="relative">
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
                  value={newAddress}
                  onChange={(event) => setNewAddress(event.target.value)}
                  placeholder={chain.placeholder}
                  aria-label="New wallet address"
                  className="min-w-0 flex-1 border-none bg-transparent px-[15px] py-[13px] font-mono text-[13px] outline-none"
                />
                {newAddress.trim().length >= 20 && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void addAddress()}
                    className="flex-none cursor-pointer rounded-r-[11px] border-l border-hair-soft px-4 font-mono text-[9.5px] tracking-[0.12em] text-primary transition hover:bg-surface disabled:opacity-50"
                  >
                    SAVE
                  </button>
                )}
              </div>

              {chainOpen && (
                <div className="absolute left-0 top-[calc(100%+8px)] z-[120] w-[250px] rounded-[13px] border border-hair bg-surface p-1.5 shadow-card [animation:jsUp_.22s_both]">
                  {enabledChains.map((option) => (
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
                  {enabledChains.length === 0 && (
                    <p className="px-3 py-3 text-[11.5px] text-muted">
                      No USDT network is enabled right now.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mb-[18px] [animation:jsUp_.3s_both]">
            {rewards.length === 0 ? (
              <p className="rounded-[11px] border border-hair p-4 text-[12.5px] leading-6 text-muted">
                No gift cards are available right now. Withdraw in USDT, or check back - the
                catalogue is managed from the console.
              </p>
            ) : (
              <div className="flex flex-wrap gap-[7px]">
                {rewards.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    disabled={!card.inStock}
                    onClick={() => setRewardId(card.id)}
                    aria-pressed={rewardId === card.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-[10px] border py-2 pl-2 pr-3 transition-all disabled:cursor-not-allowed disabled:opacity-40",
                      rewardId === card.id
                        ? "border-primary bg-[color-mix(in_oklab,var(--primary)_10%,transparent)]"
                        : "border-hair hover:border-primary",
                    )}
                  >
                    <span className="grid size-[22px] place-items-center rounded-md bg-surface font-mono text-[7px] text-muted">
                      {(card.brand ?? card.name).slice(0, 3).toUpperCase()}
                    </span>
                    <span className="text-[12.5px] font-medium">{card.name}</span>
                    <span data-count className="font-mono text-[11px] text-muted">
                      ${card.priceUsd}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="mb-3 text-[12.5px] leading-6 text-danger">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={() => void request()}
          disabled={!canSubmit}
          className="w-full cursor-pointer rounded-[11px] bg-primary p-[15px] text-center font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] text-on-primary transition hover:-translate-y-px hover:brightness-[1.08] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
        >
          {busy ? "Working…" : "Request payout"}
        </button>

        {method === "usdt" && addresses.length === 0 && (
          <p className="mt-3 text-center text-[11.5px] text-muted">
            Save a wallet address above to withdraw.
          </p>
        )}
      </div>

      <section className="mt-3.5 rounded-card border border-hair bg-surface p-[clamp(20px,3vw,26px)]">
        <h2 className="mb-2 font-mono text-[9.5px] tracking-[0.22em] text-muted">PAYOUT HISTORY</h2>
        {history.length === 0 ? (
          <div className="px-2.5 py-[30px] text-center">
            <p className="mb-2.5 font-mono text-[10px] tracking-[0.16em] text-muted">EMPTY</p>
            <p className="mb-1.5 text-sm font-semibold">No payouts yet</p>
            <p className="text-[12.5px] text-muted">Your first withdrawal will appear here.</p>
          </div>
        ) : (
          history.map((payout) => (
            <div
              key={payout.id}
              className="flex items-center gap-3.5 border-b border-hair-soft py-[15px] last:border-b-0"
            >
              <span className="grid size-8 flex-none place-items-center rounded-[9px] bg-surface-2 font-mono text-[8px] text-muted">
                PAY
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium">
                  {payout.rewardItem
                    ? payout.rewardItem.name
                    : `USDT · ${payout.payoutAddress?.chain ?? "-"}`}
                </p>
                <p className="mt-0.5 text-[11.5px] text-muted">
                  {new Date(payout.requestedAt).toLocaleDateString()}
                </p>
                {payout.rewardItem && payout.status === "PAID" && payout.externalTxId && (
                  <p className="mt-1 break-all rounded-md bg-surface-2 px-2 py-1 font-mono text-[10.5px] text-fg">
                    DELIVERY REFERENCE: {payout.externalTxId}
                  </p>
                )}
              </div>
              <span
                className="flex-none rounded-md px-[9px] py-[5px] font-mono text-[8.5px] tracking-[0.12em]"
                style={{
                  background: `color-mix(in oklab, ${STATUS_TONE[payout.status] ?? "var(--text-muted)"} 16%, transparent)`,
                  color: STATUS_TONE[payout.status] ?? "var(--text-muted)",
                }}
              >
                {payout.status}
              </span>
              <span data-count className="flex-none text-right font-mono text-[13.5px]">
                ${payout.netAmountUsd ?? payout.amountUsd ?? "0.00"}
                {payout.feeUsd && payout.feeUsd !== "0.00" && (
                  <small className="mt-1 block text-[9.5px] text-muted">
                    ${payout.grossAmountUsd ?? payout.amountUsd} gross · ${payout.feeUsd} fee
                  </small>
                )}
              </span>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
