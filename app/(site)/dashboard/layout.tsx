import { DashboardSidebar, DashboardTabBar } from "@/components/dashboard/dashboard-nav";
import { SessionSeed } from "@/components/auth/session-seed";
import type { WalletSummary } from "@/components/wallet/use-wallet";
import { fetchAuthed, fetchSessionUser } from "@/lib/data/session";
import { fetchPublicSettings } from "@/lib/data/settings";

/**
 * Sidebar on desktop, bottom tab bar on smaller screens (handoff §9).
 *
 * The gutter is *outside* `--maxw`, which is the same nesting the navbar uses
 * (`px-[var(--pad)]` on the sticky wrapper, `max-w-[var(--maxw)]` within it).
 * It used to be inside, so the whole dashboard ran 2 × `--pad` — 112px on
 * desktop — narrower than the bar above it, and every page in the account
 * section sat visibly inset from its own navigation.
 */
export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  /**
   * Both reads together, on the server.
   *
   * They are independent - each only needs the bearer token - so they go in
   * parallel rather than one behind the other. That is the distinction that
   * matters: in the browser the wallet was *dependent* on the session,
   * because it could not be requested until auth resolved, and two sequential
   * round trips is a floor no query tuning gets under. Here the token is
   * already in hand, so the dependency disappears and both are in flight at
   * once.
   *
   * Neither can fail the page: `fetchPublicSettings` falls back to defaults and
   * `fetchAuthed` returns null, which puts the client back on exactly the path
   * it used before.
   */
  const [{ clubEnabled }, user, wallet] = await Promise.all([
    fetchPublicSettings(),
    fetchSessionUser(),
    fetchAuthed<WalletSummary>("/wallet"),
  ]);

  return (
    <div className="px-[var(--pad)]">
      <SessionSeed user={user} wallet={wallet} />
      <div className="mx-auto flex max-w-[var(--maxw)] items-start gap-[clamp(24px,3vw,44px)]">
        <DashboardSidebar clubEnabled={clubEnabled} />
        {/* Bottom padding clears the tab bar and the support launcher. */}
        <div className="min-w-0 flex-1 pb-[112px] pt-[clamp(28px,4vw,40px)] lg:pb-24">
          {children}
        </div>
        <DashboardTabBar clubEnabled={clubEnabled} />
      </div>
    </div>
  );
}
