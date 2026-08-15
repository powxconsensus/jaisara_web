"use client";

import { useState } from "react";

import { seedSessionUser } from "@/components/auth/auth-context";
import { seedWallet, type WalletSummary } from "@/components/wallet/use-wallet";
import type { AuthUser } from "@/lib/auth-types";

/**
 * Hands server-resolved state to the client stores before the first paint.
 *
 * Rendered by the layouts that are dynamic anyway - dashboard and console - so
 * the public storefront keeps its static rendering. Putting the same read in
 * the root layout removes the same waterfall and opts every page out of
 * prerendering, which trades the storefront's speed for the account area's.
 *
 * `useState` with an initialiser runs during render, and React renders a parent
 * before its children while running effects children-first. So this always
 * lands before `AuthProvider`'s mount effect, which is what lets that effect
 * skip its fetch rather than merely race it.
 *
 * Renders nothing.
 */
export function SessionSeed({
  user,
  wallet,
}: {
  user: AuthUser | null;
  /** Omitted where a balance is not part of the first paint, as in the console. */
  wallet?: WalletSummary | null;
}) {
  useState(() => {
    seedSessionUser(user);
    if (wallet !== undefined) seedWallet(wallet);
    return null;
  });

  return null;
}
