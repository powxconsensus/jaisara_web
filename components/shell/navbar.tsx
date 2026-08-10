"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PRIMARY_NAV } from "@/lib/nav";
import { cn } from "@/lib/cn";
import { useAuth } from "@/components/auth/auth-context";
import { useWallet } from "@/components/wallet/use-wallet";
import { Logo } from "@/components/ui/logo";
import { SignOutIcon } from "@/components/ui/icons";
import { ModeToggle } from "@/components/theme/mode-toggle";
import { PaletteMenu } from "@/components/theme/palette-menu";
import { CouponPill } from "./coupon-pill";
import { MenuOverlay } from "./menu-overlay";

/**
 * Floating navbar: a translucent, blurred bar that sticks 14px from the top.
 * Inline links show at desktop (≥1180px); below that the menu overlay takes
 * over. Anchor targets clear it via `scroll-margin-top` (handoff §6).
 */
export function Navbar() {
  const pathname = usePathname();
  const { status, user, signOut } = useAuth();
  const { wallet } = useWallet();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const signedIn = status === "authenticated";
  const hasAdminAccess = Boolean(user?.permissions?.some((permission) =>
    ["marketing:view", "post:write", "user:view"].includes(permission),
  ));
  const initials = (user?.displayName || user?.email || "?")
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const menuTriggerRef = useRef<HTMLButtonElement>(null);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    router.push("/");
    router.refresh();
  };

  // Close the overlay whenever the route changes — including browser back,
  // which no link handler would catch. Adjusting state during render is
  // React's recommended alternative to a route-watching effect.
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setMenuOpen(false);
  }

  return (
    <div className="sticky top-3.5 z-[90] px-[var(--pad)]">
      {/* No console branch here any more. The console lives in its own route
          group with its own fixed frame, so this bar never renders there —
          widening it for a surface it cannot appear on was dead code. */}
      <div className="relative mx-auto max-w-[var(--maxw)]">
        <div
          className="relative z-[96] flex h-[58px] items-center gap-2.5 rounded-[14px] border border-hair py-0 pl-4 pr-2.5 [backdrop-filter:blur(22px)_saturate(1.3)]"
          style={{ background: "color-mix(in oklab, var(--bg) 72%, transparent)" }}
        >
          <Logo />

          <nav className="ml-2.5 hidden items-center gap-0.5 lg:flex">
            {PRIMARY_NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "rounded-[9px] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.13em] transition",
                    active ? "bg-surface text-fg" : "text-muted hover:text-fg",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex-1" />

          <CouponPill className="hidden md:flex" />

          <div className="hidden items-center gap-1 md:flex">
            {hasAdminAccess && (
              <Link
                href="/console"
                className="rounded-[9px] px-3 py-2 font-mono text-[9.5px] uppercase tracking-[0.12em] text-primary hover:bg-surface"
              >
                Console
              </Link>
            )}
            <ModeToggle />
            <PaletteMenu />
          </div>

          {/* Inside the app the CTA is replaced by the wallet balance and the
              account monogram, as in the prototype's signed-in state. */}
          {signedIn ? (
            <Link href="/dashboard" className="hidden flex-none items-center gap-2 text-fg md:flex">
              {/* Only once the real balance is known — an invented number
                  here is the first thing a member sees. */}
              {wallet && (
                <span
                  data-count
                  className="flex h-9 items-center rounded-[10px] border border-hair px-3 font-mono text-xs"
                >
                  ${wallet.availableUsd}
                </span>
              )}
              <span
                className="grid size-8 place-items-center rounded-[10px] font-mono text-[11px] text-primary"
                style={{ background: "color-mix(in oklab, var(--primary) 20%, var(--surface))" }}
              >
                {initials}
              </span>
            </Link>
          ) : null}

          {/* Signing out belongs where you always are, not three clicks deep in
              account settings. Icon only — the label is the tooltip and the
              accessible name. */}
          {signedIn ? (
            <button
              type="button"
              disabled={signingOut}
              onClick={() => void handleSignOut()}
              title="Sign out"
              aria-label="Sign out"
              className="hidden size-9 flex-none cursor-pointer place-items-center rounded-[10px] border border-hair text-muted transition hover:border-danger hover:text-danger disabled:cursor-wait disabled:opacity-60 md:grid"
            >
              <SignOutIcon size={16} />
            </button>
          ) : status === "guest" ? (
            <Link
              href="/signup"
              className="hidden h-9 flex-none items-center gap-2 rounded-[10px] bg-primary px-4 font-mono text-[11px] font-semibold uppercase tracking-[0.13em] text-on-primary transition hover:brightness-[1.08] md:flex"
            >
              Start<span className="text-[13px]">↗</span>
            </Link>
          ) : null}

          {/* Stays above the overlay and becomes the close control in the
              identical slot — a requirement from the handoff. */}
          <button
            type="button"
            ref={menuTriggerRef}
            data-menu-trigger
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            /* `pointer-events-auto` keeps it clickable while the modal dialog
               disables pointer events on the body. */
            className="pointer-events-auto flex h-9 flex-none cursor-pointer items-center gap-2.5 rounded-[10px] border border-hair px-3.5 transition hover:border-primary lg:hidden"
          >
            <span className="flex flex-col gap-1">
              <span
                className={cn(
                  "block h-[1.5px] w-[13px] bg-fg transition-transform",
                  menuOpen && "translate-y-[2.75px] rotate-45",
                )}
              />
              <span
                className={cn(
                  "block h-[1.5px] w-[13px] bg-fg transition-transform",
                  menuOpen && "-translate-y-[2.75px] -rotate-45",
                )}
              />
            </span>
            <span className="font-mono text-[10px] tracking-[0.16em]">
              {menuOpen ? "CLOSE" : "MENU"}
            </span>
          </button>
        </div>
      </div>

      <MenuOverlay open={menuOpen} onOpenChange={setMenuOpen} triggerRef={menuTriggerRef} />
    </div>
  );
}
