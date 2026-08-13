"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useSyncExternalStore, type ReactNode } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { NotFoundPage } from "@/components/shell/not-found-page";
import { useAccess } from "@/components/console/use-permissions";
import { CONSOLE_GROUPS, SECTION_CODE, visibleSections } from "@/lib/console-nav";
import { humanRole } from "@/lib/console-format";
import { useResource } from "@/lib/console-api";
import { ADMIN_PERMISSIONS as P } from "@/lib/admin-types";
import { cn } from "@/lib/cn";

/**
 * The console frame.
 *
 * A fixed rail and a slim top bar around one scrolling pane, filling the
 * viewport - not a centred column inside the marketing shell. The console now
 * lives in its own route group for exactly that reason: it was inheriting the
 * floating navbar, the footer and the member support widget, none of which
 * belong on an internal tool. The widget was the clearest tell - it invited
 * the person answering tickets to open a ticket.
 *
 * Filling the viewport is not cosmetic. Every screen here is a table or a
 * two-pane comparison, and a reading-width column meant claims wrapped, import
 * diffs scrolled sideways, and the queue showed four rows where it could show
 * twelve.
 *
 * Sections come from the account's live permissions, so a role change takes
 * effect on the next request without a deploy. An account with no console
 * permission at all gets the ordinary not-found page rather than "access
 * denied" - there is no reason to confirm to a stranger that this exists.
 */

const RAIL_KEY = "jaisara.console.rail";
/** Same-tab notification; `storage` only fires in the *other* tabs. */
const RAIL_EVENT = "jaisara:console-rail";

function subscribeRail(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(RAIL_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(RAIL_EVENT, onChange);
  };
}

function railCollapsed(): boolean {
  return window.localStorage.getItem(RAIL_KEY) === "1";
}

/**
 * The rail's collapsed state, kept in `localStorage`.
 *
 * An external store rather than state seeded from an effect. The server cannot
 * know what this browser chose, so the server snapshot is always "expanded"
 * and React reconciles on hydration - which is both hydration-safe and what
 * the compiler's `set-state-in-effect` rule is asking for. Listening to
 * `storage` as well means two console tabs agree instead of drifting apart.
 */
function useRailCollapsed(): [boolean, () => void] {
  const collapsed = useSyncExternalStore(subscribeRail, railCollapsed, () => false);

  const toggle = useCallback(() => {
    window.localStorage.setItem(RAIL_KEY, railCollapsed() ? "0" : "1");
    window.dispatchEvent(new Event(RAIL_EVENT));
  }, []);

  return [collapsed, toggle];
}

export function ConsoleShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { status } = useAuth();
  const { permissions, roles, email } = useAccess();
  const sections = visibleSections(permissions);
  const [collapsed, toggleRail] = useRailCollapsed();

  /**
   * Waiting work, marked on the rail.
   *
   * Support is the one section whose queue nobody is prompted to open - a
   * claim shows up because somebody is chasing it, a ticket just sits there.
   * Only fetched for accounts that can read the queue anyway.
   */
  const support = useResource<{ OPEN: number }>(
    permissions.has(P.supportView) ? "/api/admin/support/counts" : null,
  );
  const waiting: Record<string, number> = {
    "/console/support": support.data?.OPEN ?? 0,
  };

  if (status === "loading") {
    return <div aria-label="Loading the console" aria-busy="true" className="min-h-dvh" />;
  }

  // Same screen the root 404 boundary renders, chrome included. A visitor
  // without console permissions is not in a different kind of "missing" than
  // one who mistyped a URL, and should not be shown a different kind of page.
  if (sections.length === 0) {
    return <NotFoundPage />;
  }

  const groups = CONSOLE_GROUPS.map((group) => ({
    group,
    items: sections.filter((section) => section.group === group),
  })).filter((entry) => entry.items.length > 0);

  // Deepest matching section, for the breadcrumb in the top bar.
  const current = sections
    .filter((section) => pathname === section.href || pathname.startsWith(`${section.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];

  const totalWaiting = Object.values(waiting).reduce((sum, count) => sum + count, 0);

  return (
    <div
      className="console-root flex h-dvh overflow-hidden bg-bg text-fg"
      style={collapsed ? ({ ["--rail" as string]: "var(--rail-collapsed)" } as object) : undefined}
    >
      {/* ── Rail ──────────────────────────────────────────────────────────── */}
      <nav
        aria-label="Console sections"
        className="console-scroll hidden shrink-0 flex-col overflow-y-auto border-r border-[var(--console-hair)] bg-surface transition-[width] duration-200 md:flex"
        style={{ width: "var(--rail)" }}
      >
        <Link
          href="/console"
          title="Console overview"
          className={cn(
            "flex items-center gap-2.5 border-b border-[var(--console-hair)] px-3 py-3",
            collapsed && "justify-center px-0",
          )}
        >
          <span className="grid size-[26px] flex-none place-items-center rounded-[8px] bg-primary font-display text-[13px] font-black text-on-primary">
            J
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate font-display text-[12.5px] font-bold leading-none tracking-[0.02em]">
                JAISARA
              </span>
              <span className="mt-1 block font-mono text-[length:var(--ct-label)] leading-none tracking-[0.14em] text-muted">
                INTERNAL
              </span>
            </span>
          )}
        </Link>

        <div className="flex-1 p-2">
          <RailLink
            href="/console"
            label="Overview"
            code="OV"
            active={pathname === "/console"}
            collapsed={collapsed}
          />

          {groups.map(({ group, items }) => (
            <div key={group} className="mt-3.5 first:mt-2">
              {collapsed ? (
                <div aria-hidden className="mx-auto mb-2 h-px w-5 bg-[var(--console-hair)]" />
              ) : (
                <p className="px-2 pb-1.5 font-mono text-[length:var(--ct-label)] tracking-[0.18em] text-muted">
                  {group.toUpperCase()}
                </p>
              )}
              {items.map((section) => (
                <RailLink
                  key={section.href}
                  href={section.href}
                  label={section.label}
                  code={SECTION_CODE[section.href] ?? section.label.slice(0, 2).toUpperCase()}
                  active={
                    pathname === section.href || pathname.startsWith(`${section.href}/`)
                  }
                  collapsed={collapsed}
                  pending={waiting[section.href] ?? 0}
                />
              ))}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={toggleRail}
          aria-expanded={!collapsed}
          title={collapsed ? "Expand the rail" : "Collapse the rail"}
          className="flex cursor-pointer items-center gap-2 border-t border-[var(--console-hair)] px-3 py-2.5 font-mono text-[length:var(--ct-label)] tracking-[0.14em] text-muted transition hover:text-fg"
        >
          <span aria-hidden className="text-[11px] leading-none">
            {collapsed ? "»" : "«"}
          </span>
          {!collapsed && "COLLAPSE RAIL"}
        </button>
      </nav>

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="flex flex-none items-center gap-3 border-b border-[var(--console-hair)] bg-surface px-[var(--console-pad)]"
          style={{ height: "var(--topbar-h)" }}
        >
          {/* Below md the rail is gone entirely, so the breadcrumb doubles as
              the way back to the section list. */}
          <Link
            href="/console"
            className="font-mono text-[length:var(--ct-label)] tracking-[0.16em] text-muted transition hover:text-fg"
          >
            CONSOLE
          </Link>
          {current && (
            <>
              <span aria-hidden className="font-mono text-[length:var(--ct-label)] text-muted">
                /
              </span>
              <span className="truncate font-mono text-[length:var(--ct-label)] tracking-[0.16em] text-primary">
                {current.label.toUpperCase()}
              </span>
            </>
          )}

          <span className="ml-auto flex items-center gap-2.5">
            {totalWaiting > 0 && (
              <Link
                href="/console/support"
                className="hidden items-center gap-1.5 rounded-[7px] px-2 py-1 font-mono text-[length:var(--ct-label)] tracking-[0.12em] text-danger transition hover:brightness-125 sm:flex"
                style={{ background: "color-mix(in oklab, var(--danger) 12%, transparent)" }}
              >
                {totalWaiting} WAITING
              </Link>
            )}
            <span className="hidden min-w-0 text-right leading-tight lg:block">
              <span className="block truncate text-[length:var(--ct-small)]">{email}</span>
              {roles.length > 0 && (
                <span className="block font-mono text-[length:var(--ct-label)] tracking-[0.12em] text-primary">
                  {roles.map(humanRole).join(" · ").toUpperCase()}
                </span>
              )}
            </span>
            <Link
              href="/dashboard"
              title="Leave the console"
              className="rounded-[7px] border border-[var(--console-hair)] px-2.5 py-1.5 font-mono text-[length:var(--ct-label)] tracking-[0.13em] text-muted transition hover:border-primary hover:text-fg"
            >
              EXIT ↗
            </Link>
          </span>
        </header>

        {/* Mobile section strip. A vertical rail on a phone is a wall to
            scroll past, so below md the sections become one horizontal row. */}
        <div className="console-scroll flex flex-none gap-1 overflow-x-auto border-b border-[var(--console-hair)] bg-surface px-[var(--console-pad)] py-1.5 md:hidden">
          {[{ href: "/console", label: "Overview" }, ...sections].map((section) => {
            const active =
              section.href === "/console"
                ? pathname === "/console"
                : pathname === section.href || pathname.startsWith(`${section.href}/`);
            return (
              <Link
                key={section.href}
                href={section.href}
                className={cn(
                  "whitespace-nowrap rounded-[8px] px-2.5 py-1.5 font-mono text-[length:var(--ct-label)] uppercase tracking-[0.13em] transition",
                  active ? "bg-primary text-on-primary" : "text-muted",
                )}
              >
                {section.label}
              </Link>
            );
          })}
        </div>

        {/* The only scrolling region. Pages that want a full-height two-pane
            layout size against this box with `h-full`, which is why the
            padding lives on an inner wrapper rather than here. */}
        <main className="console-scroll min-h-0 flex-1 overflow-y-auto">
          <div className="min-h-full p-[var(--console-pad)]">{children}</div>
        </main>
      </div>
    </div>
  );
}

/**
 * One rail entry.
 *
 * The two-letter code is what survives collapsing. Icons were the obvious
 * alternative and were rejected: ten sections would need ten glyphs that all
 * mean "a list of things", and "CL" is unambiguous next to "CA" in a way that
 * two similar icons never are.
 */
function RailLink({
  href,
  label,
  code,
  active,
  collapsed,
  pending = 0,
}: {
  href: string;
  label: string;
  code: string;
  active: boolean;
  collapsed: boolean;
  pending?: number;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      title={collapsed ? label : undefined}
      className={cn(
        "mb-0.5 flex items-center gap-2.5 rounded-[8px] px-2 py-[7px] transition",
        collapsed && "justify-center px-0",
        active ? "bg-primary/12 text-fg" : "text-muted hover:bg-surface-2 hover:text-fg",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid size-[22px] flex-none place-items-center rounded-[6px] font-mono text-[9px] tracking-[0.04em] transition",
          active ? "bg-primary text-on-primary" : "bg-surface-2 text-muted",
        )}
      >
        {code}
      </span>
      {!collapsed && (
        <>
          <span className="min-w-0 flex-1 truncate font-mono text-[10px] uppercase tracking-[0.11em]">
            {label}
          </span>
          {pending > 0 && (
            <span
              aria-label={`${pending} waiting`}
              className="grid min-w-[16px] flex-none place-items-center rounded-full bg-danger px-1 text-[8.5px] leading-[15px] text-white"
            >
              {pending > 99 ? "99+" : pending}
            </span>
          )}
        </>
      )}
      {collapsed && pending > 0 && (
        <span
          aria-label={`${pending} waiting`}
          className="absolute ml-4 -mt-4 size-[7px] rounded-full bg-danger ring-2 ring-surface"
        />
      )}
    </Link>
  );
}
