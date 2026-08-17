"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_PUBLIC_SETTINGS } from "@/lib/data/settings-defaults";

/**
 * What a point is worth, for the screens that show other people's money.
 *
 * `points_per_usd` is runtime configuration - the owner can change it, and it
 * reprices every stored balance when they do, because points are stored and
 * dollars are derived. Every console screen that prints a dollar figure
 * therefore has to know the live rate.
 *
 * Until this existed they did not. `pointsToUsd` carried a default of 100 and
 * twelve console call sites took it, so the payout queue, the member panel and
 * the claim reviewer would all have reported ten times the real amount the
 * moment somebody set the rate to 1000 - on the one screen where an operator
 * releases actual money. The member dashboard passed the real rate down as a
 * prop and was correct; the console was never updated to match, and nothing in
 * the arithmetic could notice.
 *
 * The rate is now a required argument to `pointsToUsd`, so the compiler refuses
 * a call that does not supply one. This is where the console gets it.
 *
 * Read on the server in the console layout and handed down, rather than
 * fetched after mount: it is needed by the first paint of every table, and a
 * figure that corrects itself a round trip later is worse than one that is
 * right immediately.
 */
const PointsRateContext = createContext<number>(DEFAULT_PUBLIC_SETTINGS.pointsPerUsd);

export function PointsRateProvider({
  pointsPerUsd,
  children,
}: {
  pointsPerUsd: number;
  children: ReactNode;
}) {
  return <PointsRateContext value={pointsPerUsd}>{children}</PointsRateContext>;
}

/** How many points make a dollar. Always a power of ten; the API guarantees it. */
export function usePointsPerUsd(): number {
  return useContext(PointsRateContext);
}
