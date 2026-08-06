"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { RefObject } from "react";
import { MENU_NAV } from "@/lib/nav";
import { PALETTES, swatchFor } from "@/lib/theme";
import { useTheme } from "@/components/theme/use-theme";
import { useAuth } from "@/components/auth/auth-context";
import { CouponPill } from "./coupon-pill";

/**
 * Full-screen menu (handoff §6). Radix Dialog supplies the requirements that
 * were each bugs at some point: role/aria-modal, Escape, backdrop click, body
 * scroll lock with restore, focus trap, and focus returned to the trigger.
 *
 * The trigger lives in the navbar and stays above the overlay, switching its
 * label MENU → CLOSE, so the close control occupies the exact slot MENU did.
 */
export function MenuOverlay({
  open,
  onOpenChange,
  triggerRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The navbar button that opened the menu; focus returns here on close. */
  triggerRef: RefObject<HTMLButtonElement | null>;
}) {
  const { palette, setPalette, mode, toggleMode } = useTheme();
  const { status, signOut } = useAuth();
  const router = useRouter();
  const close = () => onOpenChange(false);
  const logout = async () => {
    await signOut();
    close();
    router.push("/");
    router.refresh();
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Content
          id="site-menu"
          aria-label="Site menu"
          /* The trigger sits outside this content (in the navbar) and does its
             own toggling; without this guard Radix would close on the same
             pointerdown that the trigger then re-opens. */
          onInteractOutside={(event) => {
            if ((event.target as HTMLElement | null)?.closest?.("[data-menu-trigger]")) {
              event.preventDefault();
            }
          }}
          /* Radix restores focus to its own Dialog.Trigger; ours lives in the
             navbar, so return focus there by hand. */
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            triggerRef.current?.focus();
          }}
          className="fixed inset-0 z-[85] flex flex-col overflow-y-auto px-[var(--pad)] pb-7 pt-[calc(var(--pad)+40px)] [animation:jsIn_.25s_ease_both] [backdrop-filter:blur(26px)_saturate(1.2)]"
          style={{ background: "color-mix(in oklab, var(--bg) 94%, transparent)" }}
        >
          <Dialog.Title className="sr-only">Site menu</Dialog.Title>
          <Dialog.Description className="sr-only">
            Primary navigation, palette picker and legal links.
          </Dialog.Description>

          <div className="mx-auto flex w-full max-w-[var(--maxw)] flex-1 flex-col">
            <p className="mb-4 font-mono text-[10px] tracking-[0.24em] text-muted md:mb-6">INDEX</p>

            <nav>
              {MENU_NAV.map((item, i) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={close}
                  className="group flex items-baseline gap-4 border-t border-hair-soft py-3 text-fg transition-transform duration-[250ms] ease-[cubic-bezier(.2,.8,.2,1)] last:border-b hover:translate-x-2.5 md:gap-[22px] md:py-4"
                >
                  <span className="font-mono text-[11px] text-muted">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={`font-display text-[clamp(29px,6.5vw,72px)] font-black uppercase leading-none tracking-[-0.02em] ${
                      item.soon ? "text-muted" : "group-hover:text-primary"
                    }`}
                  >
                    {item.label}
                  </span>
                  {item.soon && (
                    <span
                      className="rounded-md border px-2 py-1 font-mono text-[9px] tracking-[0.16em] text-club"
                      style={{ borderColor: "color-mix(in oklab, var(--club) 40%, transparent)" }}
                    >
                      SOON
                    </span>
                  )}
                </Link>
              ))}
            </nav>

            <div className="flex-1" />

            <div className="flex flex-wrap items-center justify-between gap-3.5 pt-[30px]">
              <CouponPill />
              <div className="flex flex-wrap gap-2">
                {status === "authenticated" ? (
                  <>
                    <Link
                      href="/dashboard"
                      onClick={close}
                      className="flex items-center gap-2 rounded-[10px] bg-primary px-[18px] py-[11px] font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-on-primary"
                    >
                      Dashboard ↗
                    </Link>
                    <button
                      type="button"
                      onClick={() => void logout()}
                      className="cursor-pointer rounded-[10px] border border-hair px-4 py-[11px] font-mono text-[10px] tracking-[0.12em] text-muted"
                    >
                      SIGN OUT
                    </button>
                  </>
                ) : (
                  <Link
                    href="/signup"
                    onClick={close}
                    className="flex items-center gap-2 rounded-[10px] bg-primary px-[18px] py-[11px] font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-on-primary"
                  >
                    Free account ↗
                  </Link>
                )}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="flex cursor-pointer items-center gap-2 rounded-[10px] border border-hair px-4 py-[11px] font-mono text-[10px] tracking-[0.12em] text-muted"
                >
                  MODE: <span className="uppercase text-fg">{mode}</span>
                </button>
              </div>

              <div className="w-full border-t border-hair-soft pt-4">
                <p className="mb-2.5 font-mono text-[9px] tracking-[0.22em] text-muted">PALETTE</p>
                <div className="flex flex-wrap gap-[7px]">
                  {PALETTES.map((p) => {
                    const swatch = swatchFor(p, mode);
                    return (
                      <button
                        key={p.key}
                        type="button"
                        title={p.name}
                        aria-pressed={p.key === palette}
                        onClick={() => setPalette(p.key)}
                        className="flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] border py-2 pl-2 pr-3"
                        style={{ borderColor: p.key === palette ? "var(--primary)" : "var(--hair)" }}
                      >
                        <span className="flex flex-none gap-0.5">
                          {swatch.map((colour, i) => (
                            <span
                              key={i}
                              className="h-4 w-[9px] rounded-[3px]"
                              style={{
                                background: colour,
                                border: i === 0 ? "1px solid var(--hair)" : undefined,
                              }}
                            />
                          ))}
                        </span>
                        <span className="whitespace-nowrap text-xs font-medium">{p.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-[18px] font-mono text-[9.5px] tracking-[0.14em] text-muted">
                <Link href="/terms" onClick={close} className="text-muted hover:text-fg">
                  TERMS
                </Link>
                <Link href="/privacy" onClick={close} className="text-muted hover:text-fg">
                  PRIVACY
                </Link>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
