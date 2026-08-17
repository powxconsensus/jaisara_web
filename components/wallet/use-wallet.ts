"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { apiFetch } from "@/lib/api-fetch";

/**
 * The signed-in member's real balances.
 *
 * Everything that shows money used to read a hardcoded `WALLET` constant, so a
 * brand-new account saw $184.50 in the navbar. A wrong balance is worse than no
 * balance on a product whose whole promise is "tracked to the cent" - so this
 * returns `null` until the real figure arrives and callers render nothing
 * rather than a placeholder number.
 *
 * ── Why this is a store rather than per-component state ───────────────────
 *
 * It used to hold its own `useState` per caller, which meant the navbar, the
 * wallet page and the withdraw form each had a private copy. Requesting a
 * payout debits the balance immediately (that is what makes double-spending
 * impossible), so the moment the form succeeded every *other* copy was showing
 * money the member no longer had - and the one screen where that is least
 * forgivable is the one with a balance printed in the corner.
 *
 * One module-level snapshot, read through `useSyncExternalStore`, so
 * `refreshWallet()` after a withdrawal updates every surface at once.
 */

export interface WalletSummary {
  availablePoints: string;
  pendingPoints: string;
  lifetimePoints: string;
  clubPoints: string;
  /** Committed to a payout that has been requested but has not gone out. */
  holdPoints: string;
  availableUsd: string;
  pendingUsd: string;
  lifetimeUsd: string;
  clubUsd: string;
  holdUsd: string;
  /** How many in-flight payouts that hold is spread across. */
  holdCount: number;
  minWithdrawalPoints: string;
  minWithdrawalUsd: string;
  /** How much more is needed to reach the minimum. "0.00" once it is met. */
  shortfallUsd: string;
  canWithdraw: boolean;
  /** The conversion rate, for the "N points = $1" line. */
  pointsPerUsd: number;
}

interface WalletState {
  wallet: WalletSummary | null;
  loading: boolean;
  /**
   * The last read failed.
   *
   * Separate from `wallet === null` because the two mean opposite things to
   * somebody looking at a balance: null-with-no-error is "still loading", and
   * null-with-an-error is "we could not find out". Collapsing them is how a
   * service outage came to render as `$0.00` - a real financial statement about
   * somebody's money, invented from a failed request.
   */
  error: boolean;
}

/** Frozen so `getServerSnapshot` is referentially stable across renders. */
const EMPTY: WalletState = Object.freeze({ wallet: null, loading: false, error: false });
const LOADING: WalletState = Object.freeze({ wallet: null, loading: true, error: false });
const FAILED: WalletState = Object.freeze({ wallet: null, loading: false, error: true });

let state: WalletState = EMPTY;
let loadedOnce = false;
let inFlight: AbortController | null = null;

const listeners = new Set<() => void>();

function set(next: WalletState) {
  state = next;
  for (const listener of listeners) listener();
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/**
 * Re-reads the balance and tells every subscriber.
 *
 * Call it after anything that moves money - a withdrawal request is the one
 * that matters, since the debit happens server-side the instant it succeeds.
 */
export async function refreshWallet(): Promise<void> {
  // A newer read always wins; an aborted one must not overwrite it on the way
  // out, hence the `own.signal.aborted` checks rather than a shared flag.
  inFlight?.abort();
  const own = new AbortController();
  inFlight = own;
  loadedOnce = true;
  if (state.wallet === null) set(LOADING);

  try {
    const response = await apiFetch("/api/wallet", {
      cache: "no-store",
      signal: own.signal,
    });
    if (!response.ok) throw new Error("unavailable");
    const body = (await response.json()) as WalletSummary;
    if (!own.signal.aborted) set({ wallet: body, loading: false, error: false });
  } catch {
    if (own.signal.aborted) return;

    /**
     * A failed read is not a balance of zero.
     *
     * This used to reset to `EMPTY`, and every surface reading it then
     * rendered `$0.00` and `0 PTS` - so a timeout looked exactly like a member
     * whose money had gone. Keep the last known figure if there is one and
     * mark it failed, so the screen can say the number is stale rather than
     * restate it as fact; if there has never been one, report the failure and
     * let the screen say so.
     */
    set(state.wallet ? { ...state, loading: false, error: true } : FAILED);
  }
}

/** Sign-out, or a switch of account. The next member must never see this one. */
function reset() {
  inFlight?.abort();
  inFlight = null;
  loadedOnce = false;
  if (state !== EMPTY) set(EMPTY);
}

/**
 * Seeds the store with a balance the server already read.
 *
 * Called during render rather than from an effect, so the first paint has the
 * real figure instead of a shimmer that resolves a round trip later. Ignored
 * once anything has loaded, so it cannot overwrite a fresher balance - which
 * matters after a withdrawal, where the server-rendered figure is stale the
 * moment the request succeeds.
 */
export function seedWallet(wallet: WalletSummary | null): void {
  if (loadedOnce || !wallet) return;
  loadedOnce = true;
  state = { wallet, loading: false, error: false };
}

export function useWallet(): WalletState {
  const { status } = useAuth();
  const authenticated = status === "authenticated";
  const snapshot = useSyncExternalStore(subscribe, () => state, () => EMPTY);

  useEffect(() => {
    if (!authenticated) {
      reset();
      return;
    }
    // Guarded, because several components call this hook and one balance does
    // not need fetching once per subscriber - and because a server-seeded
    // balance has already set `loadedOnce`, so the mount fetch is skipped.
    if (!loadedOnce) void refreshWallet();
  }, [authenticated]);

  return snapshot;
}
