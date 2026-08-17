import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ConsoleShell } from "@/components/console/console-shell";
import { PointsRateProvider } from "@/components/console/points-rate";
import { SessionSeed } from "@/components/auth/session-seed";
import { fetchSessionUser } from "@/lib/data/session";
import { fetchPublicSettings } from "@/lib/data/settings";

export const metadata: Metadata = {
  title: { default: "Console", template: "%s · Console" },
  robots: { index: false, follow: false },
};

/**
 * The console resolves its session on the server too.
 *
 * Every console screen is permission-gated, so each one used to render, wait
 * for `/api/auth/me`, and only then start the six or so requests its page
 * needs - the same two-wave waterfall the dashboard had, with more behind it.
 * No wallet here: the console shows other people's balances, not the
 * operator's, so seeding one would be dead weight on every screen.
 */
export default async function ConsoleLayout({ children }: { children: ReactNode }) {
  // Independent - each needs only the bearer token - so both go at once rather
  // than one behind the other. The rate has to be here rather than fetched per
  // screen: every table that prints a dollar needs it on its first paint.
  const [user, { pointsPerUsd }] = await Promise.all([
    fetchSessionUser(),
    fetchPublicSettings(),
  ]);

  return (
    <>
      <SessionSeed user={user} />
      <PointsRateProvider pointsPerUsd={pointsPerUsd}>
        <ConsoleShell>{children}</ConsoleShell>
      </PointsRateProvider>
    </>
  );
}
