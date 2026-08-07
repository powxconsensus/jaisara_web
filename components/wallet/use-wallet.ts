"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-context";

/**
 * The signed-in member's real balances.
 *
 * Everything that shows money used to read a hardcoded `WALLET` constant, so a
 * brand-new account saw $184.50 in the navbar. A wrong balance is worse than no
 * balance on a product whose whole promise is "tracked to the cent" — so this
 * returns `null` until the real figure arrives and callers render nothing
 * rather than a placeholder number.
 */

export interface WalletSummary {
  availablePoints: string;
  pendingPoints: string;
  lifetimePoints: string;
  clubPoints: string;
  availableUsd: string;
  pendingUsd: string;
  lifetimeUsd: string;
  clubUsd: string;
  minWithdrawalUsd: string;
  canWithdraw: boolean;
}

export function useWallet(): { wallet: WalletSummary | null; loading: boolean } {
  const { status } = useAuth();
  const authenticated = status === "authenticated";
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [loading, setLoading] = useState(authenticated);

  // Resetting on a sign-in/sign-out flip happens during render rather than in
  // the effect — React's recommended alternative to a state-resetting effect,
  // and it means the previous member's balance is never painted for a frame
  // after a switch.
  const [lastAuth, setLastAuth] = useState(authenticated);
  if (lastAuth !== authenticated) {
    setLastAuth(authenticated);
    setWallet(null);
    setLoading(authenticated);
  }

  useEffect(() => {
    if (!authenticated) return;

    const controller = new AbortController();

    void fetch("/api/wallet", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("unavailable");
        const body = (await response.json()) as WalletSummary;
        if (!controller.signal.aborted) setWallet(body);
      })
      .catch(() => {
        // Signed in but the balance did not load: show nothing rather than a
        // stale or invented figure.
        if (!controller.signal.aborted) setWallet(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [authenticated]);

  return { wallet, loading };
}
