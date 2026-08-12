"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { DASHBOARD_NAV } from "@/lib/dashboard-nav";
import { cn } from "@/lib/cn";
import { apiFetch } from "@/lib/api-fetch";

function useIsActive() {
  const pathname = usePathname();
  // `/dashboard` must not light up for every child route.
  return (href: string) => (href === "/dashboard" ? pathname === href : pathname.startsWith(href));
}

interface ClubBadge {
  tierName: string;
  next: { name: string; referralsNeeded: number } | null;
}

/**
 * The member's real club standing.
 *
 * This card used to render a fixture: every account was told it was on "Club
 * Tier 2" and needed "2 more referrals to unlock 25% share", whatever their
 * actual tier or referral count. A number on a persistent sidebar is one a
 * member will act on, so a wrong one is worse than none.
 */
function useClubBadge(): ClubBadge | null {
  const [club, setClub] = useState<ClubBadge | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void apiFetch("/api/club", { cache: "no-store", signal: controller.signal })
      .then(async (response) => (response.ok ? ((await response.json()) as ClubBadge) : null))
      .then((data) => {
        if (!controller.signal.aborted && data) setClub(data);
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, []);

  return club;
}

/** Sidebar, desktop only. */
export function DashboardSidebar() {
  const isActive = useIsActive();
  const club = useClubBadge();

  return (
    <aside className="sticky top-24 hidden w-[216px] flex-none flex-col gap-0.5 py-[34px] lg:flex">
      <p className="px-3 pb-3.5 font-mono text-[9px] tracking-[0.24em] text-muted">ACCOUNT</p>

      {DASHBOARD_NAV.map((item) => {
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

      {/* Absent until the real standing loads - a placeholder tier would be a
          number the member acts on before it is true. */}
      {club && (
        <div
          className="mt-[22px] rounded-[14px] border p-[17px]"
          style={{
            borderColor: "color-mix(in oklab, var(--club) 30%, var(--hair))",
            background: "color-mix(in oklab, var(--club) 7%, var(--surface))",
          }}
        >
          <p className="mb-2 font-mono text-[9.5px] uppercase tracking-[0.16em] text-club">
            {club.tierName}
          </p>
          <p className="text-xs leading-[1.55] text-muted">
            {club.next
              ? club.next.referralsNeeded > 0
                ? `${club.next.referralsNeeded} more ${
                    club.next.referralsNeeded === 1 ? "referral" : "referrals"
                  } to reach ${club.next.name}.`
                : `Keep buying to reach ${club.next.name}.`
              : "You are on the top tier."}
          </p>
        </div>
      )}
    </aside>
  );
}

/** Bottom tab bar, phones and tablets. */
export function DashboardTabBar() {
  const isActive = useIsActive();
  const items = DASHBOARD_NAV.filter((item) => !item.soon);

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
