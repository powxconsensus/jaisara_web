"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { NotFoundView } from "@/components/shell/not-found-view";
import { useAccess } from "@/components/console/use-permissions";
import { CONSOLE_GROUPS, visibleSections } from "@/lib/console-nav";
import { humanRole } from "@/lib/console-format";
import { cn } from "@/lib/cn";

/**
 * The console frame.
 *
 * Sections come from the account's live permissions, so a role change takes
 * effect on the next request without a deploy. An account with no console
 * permission at all gets the ordinary not-found page rather than "access
 * denied" — there is no reason to confirm to a stranger that this exists.
 */
export function ConsoleShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { status } = useAuth();
  const { permissions, roles, email } = useAccess();
  const sections = visibleSections(permissions);

  if (status === "loading") {
    return (
      <div
        aria-label="Loading the console"
        aria-busy="true"
        className="mx-auto min-h-[70vh] max-w-[var(--maxw)] px-[var(--pad)] py-20"
      />
    );
  }

  if (sections.length === 0) {
    return <NotFoundView />;
  }

  const groups = CONSOLE_GROUPS.map((group) => ({
    group,
    items: sections.filter((section) => section.group === group),
  })).filter((entry) => entry.items.length > 0);

  // Deepest matching section, for the breadcrumb in the top bar.
  const current = sections
    .filter((section) => pathname === section.href || pathname.startsWith(`${section.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return (
    <div className="mx-auto max-w-[var(--maxw-console)] px-[var(--pad)] pb-[110px] pt-[clamp(24px,3.5vw,44px)]">
      {/* One compact row rather than a display-type masthead. This block used
          to run ~200px tall on top of each page's own header, so a third of the
          first screen was chrome before any claim or table appeared. */}
      <header className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-hair pb-3">
        <Link
          href="/console"
          className="font-display text-[15px] font-black uppercase leading-none tracking-[-0.01em]"
        >
          Console
        </Link>
        <span
          className="rounded-md px-1.5 py-0.5 font-mono text-[8px] tracking-[0.14em] text-danger"
          style={{ background: "color-mix(in oklab, var(--danger) 14%, transparent)" }}
        >
          INTERNAL
        </span>

        {current && (
          <>
            <span aria-hidden className="text-muted">
              /
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">
              {current.label}
            </span>
          </>
        )}

        <span className="ml-auto flex items-center gap-3">
          <span className="hidden truncate text-[11px] text-muted md:inline">
            {email}
            {roles.length > 0 && (
              <span className="ml-1.5 font-mono text-[9.5px] text-primary">
                {roles.map(humanRole).join("/")}
              </span>
            )}
          </span>
          <Link
            href="/dashboard"
            title="Leave the console"
            className="rounded-[9px] border border-hair px-3 py-1.5 font-mono text-[9px] tracking-[0.13em] text-muted transition hover:border-primary hover:text-fg"
          >
            EXIT
          </Link>
        </span>
      </header>

      <div className="grid gap-5 lg:grid-cols-[214px_minmax(0,1fr)] lg:items-start">
        {/* Desktop: a grouped rail. Below lg it collapses to one scrolling row,
            because a vertical sidebar on a phone is just a wall to scroll past. */}
        <nav
          aria-label="Console sections"
          className="lg:sticky lg:top-[80px] lg:rounded-[16px] lg:border lg:border-hair lg:bg-surface lg:p-2"
        >
          <div className="flex gap-1 overflow-x-auto rounded-[14px] border border-hair bg-surface p-1.5 lg:block lg:gap-0 lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0">
            <Link
              href="/console"
              aria-current={pathname === "/console" ? "page" : undefined}
              className={cn(
                "block whitespace-nowrap rounded-[10px] px-3.5 py-2.5 font-mono text-[9.5px] uppercase tracking-[0.13em] transition lg:mb-4",
                pathname === "/console"
                  ? "bg-primary text-on-primary"
                  : "text-muted hover:bg-surface-2 hover:text-fg",
              )}
            >
              Overview
            </Link>
            {groups.map(({ group, items }) => (
              <div key={group} className="contents lg:mb-4 lg:block lg:last:mb-0">
                <p className="hidden px-2.5 pb-2 pt-1 font-mono text-[8.5px] tracking-[0.18em] text-muted lg:block">
                  {group.toUpperCase()}
                </p>
                {items.map((section) => {
                  const active =
                    pathname === section.href || pathname.startsWith(`${section.href}/`);
                  return (
                    <Link
                      key={section.href}
                      href={section.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "block whitespace-nowrap rounded-[10px] px-3.5 py-2.5 font-mono text-[9.5px] uppercase tracking-[0.13em] transition lg:mb-0.5",
                        active
                          ? "bg-primary text-on-primary"
                          : "text-muted hover:bg-surface-2 hover:text-fg",
                      )}
                    >
                      {section.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </nav>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
