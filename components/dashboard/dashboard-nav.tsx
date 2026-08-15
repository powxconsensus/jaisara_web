"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DASHBOARD_NAV, type DashboardNavItem } from "@/lib/dashboard-nav";
import { cn } from "@/lib/cn";
import { useAuth } from "@/components/auth/auth-context";

function useIsActive() {
  const pathname = usePathname();

  /**
   * Exact match, or a genuine child segment.
   *
   * A bare `startsWith` lit up `/dashboard/claim` while sitting on
   * `/dashboard/claims`, because one path is a string prefix of the other
   * without being its parent. `/dashboard` itself has to stay exact or it would
   * be active everywhere.
   */
  return (href: string) => {
    if (href === "/dashboard") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };
}

/**
 * The member's real club tier, read from the session.
 *
 * This card used to render a fixture: every account was told it was on "Club
 * Tier 2" and needed "2 more referrals to unlock 25% share", whatever their
 * actual tier or referral count. A number on a persistent sidebar is one a
 * member will act on, so a wrong one is worse than none.
 *
 * Fetching `/club` fixed the honesty and created a performance problem: it is
 * the most expensive read on any member screen, it sat on the *sidebar* so
 * every dashboard page paid for it, and on the club page it ran twice because
 * the page fetched the same endpoint for itself.
 *
 * The tier is a stored column on the user row, which every authenticated
 * request already loads, so it now arrives with the session. No request, no
 * shimmer, and it is the same value `/club` would have reported.
 *
 * Deliberately gone: the "N more referrals to reach X" line. That needs a live
 * count of qualified referrals, which is a real query, and a sidebar is not
 * where somebody acts on it. It is still on the club page - one click away, and
 * the screen that is about exactly that.
 */
function tierLabel(tierKey: string | null | undefined): string | null {
  if (!tierKey) return null;
  return tierKey.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/**
 * The nav, with the Club marked "soon" when it is switched off.
 *
 * Applied here rather than baked into `DASHBOARD_NAV`, because the list is a
 * static module and the switch is a runtime setting. The item is never removed:
 * a member who has already shared an invite link should still be able to find
 * the page and read why it is quiet.
 */
function navFor(clubEnabled: boolean): DashboardNavItem[] {
  if (clubEnabled) return DASHBOARD_NAV;
  return DASHBOARD_NAV.map((item) => (item.club ? { ...item, soon: true } : item));
}

/** Sidebar, desktop only. */
export function DashboardSidebar({ clubEnabled = true }: { clubEnabled?: boolean }) {
  const isActive = useIsActive();
  const { user } = useAuth();
  const tier = tierLabel(user?.clubTierKey);
  const items = navFor(clubEnabled);

  return (
    <aside className="sticky top-24 hidden w-[216px] flex-none flex-col gap-0.5 py-[34px] lg:flex">
      <p className="px-3 pb-3.5 font-mono text-[9px] tracking-[0.24em] text-muted">ACCOUNT</p>

      {items.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-[11px] rounded-[10px] px-[13px] py-[11px] text-[13.5px] font-medium transition hover:bg-surface",
              active ? "bg-surface text-fg" : "text-muted",
            )}
          >
            <span
              className="h-4 w-[3px] flex-none rounded-[2px]"
              style={{
                background: active ? (item.club ? "var(--club)" : "var(--primary)") : "transparent",
              }}
            />
            <span className="flex-1">{item.label}</span>
            {item.soon && (
              <span className="font-mono text-[8px] tracking-[0.14em] text-club">SOON</span>
            )}
          </Link>
        );
      })}

      {/* Absent until the session resolves - a placeholder tier would be a
          number the member acts on before it is true - and hidden entirely
          while the Club is off, where a tier badge would advertise a page that
          says "coming soon". */}
      {clubEnabled && tier && (
        <Link
          href="/dashboard/club"
          className="mt-[22px] block rounded-[14px] border p-[17px] transition hover:brightness-[1.08]"
          style={{
            borderColor: "color-mix(in oklab, var(--club) 30%, var(--hair))",
            background: "color-mix(in oklab, var(--club) 7%, var(--surface))",
          }}
        >
          <p className="mb-2 font-mono text-[9.5px] uppercase tracking-[0.16em] text-club">
            {tier}
          </p>
          {/* Points at the page that has the live numbers, rather than
              repeating a count the sidebar would have to query for. */}
          <p className="text-xs leading-[1.55] text-muted">
            See your invite link, referrals and progress to the next tier.
          </p>
        </Link>
      )}
    </aside>
  );
}

/** Bottom tab bar, phones and tablets. */
export function DashboardTabBar({ clubEnabled = true }: { clubEnabled?: boolean }) {
  const isActive = useIsActive();
  const items = navFor(clubEnabled).filter((item) => !item.soon);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[70] flex px-2 pb-4 pt-3 [backdrop-filter:blur(22px)] lg:hidden"
      style={{
        background:
          "linear-gradient(to top, var(--bg) 55%, color-mix(in oklab, var(--bg) 72%, transparent))",
      }}
    >
      {items.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-12 flex-1 flex-col items-center justify-center gap-1.5 px-0.5 py-[7px] text-center font-mono text-[8.5px] uppercase tracking-[0.1em] transition-colors",
              active ? "text-fg" : "text-muted",
            )}
          >
            <span
              className="h-[3px] w-3.5 rounded-[2px]"
              style={{
                background: active ? (item.club ? "var(--club)" : "var(--primary)") : "transparent",
              }}
            />
            {item.short}
          </Link>
        );
      })}
    </nav>
  );
}
