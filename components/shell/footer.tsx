import Link from "next/link";
import { FooterBand } from "@/components/shell/footer-band";
import { FOOTER_COLUMNS } from "@/lib/nav";
import { Logo } from "@/components/ui/logo";

const SOCIALS = [
  { label: "X (Twitter)", href: "https://x.com", icon: "x" },
  { label: "Discord", href: "https://discord.gg/AR4ndp2dz", icon: "discord" },
  { label: "Telegram", href: "https://telegram.org", icon: "telegram" },
] as const;

/**
 * Site footer. Closing CTA band [07], then four link columns over a large
 * outlined wordmark. The legal row sits on its own opaque band so the wordmark
 * never sits behind it (handoff §4.1).
 */
export function Footer() {
  return (
    <footer className="relative mt-[60px] overflow-hidden">
      <FooterBand />

      <div className="mx-auto grid max-w-[var(--maxw)] grid-cols-2 gap-[clamp(28px,4vw,52px)] border-t border-hair px-[var(--pad)] pb-5 pt-[clamp(40px,5vw,60px)] md:grid-cols-3 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div className="col-span-2 max-w-[34ch] md:col-span-3 lg:col-span-1">
          <Logo className="mb-3.5" />
          <p className="mb-[18px] text-[13px] leading-[1.65] text-muted">
            Cashback and referral rewards for prop firm traders. Buy your
            challenge through Jaisara and get paid back on every purchase.
          </p>
          <div className="flex gap-[7px]">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="grid size-9 place-items-center rounded-[10px] border border-hair text-muted transition hover:-translate-y-0.5 hover:border-primary hover:text-primary"
              >
                <SocialIcon kind={s.icon} />
              </a>
            ))}
          </div>
        </div>

        {FOOTER_COLUMNS.map((col) => (
          <div key={col.heading}>
            <p className="mb-4 font-mono text-[9px] uppercase tracking-[0.22em] text-muted">
              {col.heading}
            </p>
            <div className="flex flex-col gap-[11px] text-[13px]">
              {col.items.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="text-muted transition-colors hover:text-fg"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Oversized outlined wordmark - decorative. */}
      <div className="mx-auto max-w-[var(--maxw)] px-[var(--pad)] pt-2.5">
        <p
          aria-hidden="true"
          className="mb-2.5 select-none text-center font-display text-[clamp(44px,13.5vw,186px)] font-black uppercase leading-[0.82] tracking-[-0.02em] text-transparent"
          style={{
            WebkitTextStroke:
              "1px color-mix(in oklab, var(--text) 15%, transparent)",
          }}
        >
          Jaisara
        </p>
      </div>

      <div className="relative border-t border-hair bg-bg">
        <div className="mx-auto flex max-w-[var(--maxw)] flex-wrap items-center justify-between gap-3 px-[var(--pad)] pb-[22px] pt-[18px]">
          <span className="font-mono text-[9px] tracking-[0.12em] text-muted">
            © 2026 JAISARA - COUPONS, CASHBACK AND TRADER REWARDS
          </span>
          <span className="font-mono text-[9px] tracking-[0.12em] text-muted">
            NOT FINANCIAL ADVICE / FIRM NAMES BELONG TO THEIR OWNERS
          </span>
        </div>
      </div>
    </footer>
  );
}

function SocialIcon({ kind }: { kind: (typeof SOCIALS)[number]["icon"] }) {
  if (kind === "x") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-[15px] fill-current"
      >
        <path d="M18.24 2H21l-6.03 6.89L22.06 22H16.5l-4.35-5.69L7.17 22H4.4l6.46-7.38L4.06 2h5.7l3.94 5.21L18.24 2Zm-.97 17.7h1.53L8.92 4.18H7.28L17.27 19.7Z" />
      </svg>
    );
  }

  if (kind === "discord") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-[17px] fill-current"
      >
        <path d="M19.54 5.34A17 17 0 0 0 15.34 4l-.52 1.06a15.7 15.7 0 0 0-5.62 0L8.66 4a17.2 17.2 0 0 0-4.2 1.35C1.8 9.3 1.08 13.15 1.44 16.95a17.4 17.4 0 0 0 5.15 2.6l1.25-1.7a11 11 0 0 1-1.96-.94l.48-.37c3.78 1.75 7.9 1.75 11.64 0l.49.37c-.63.37-1.3.69-1.97.94l1.25 1.7a17.4 17.4 0 0 0 5.15-2.6c.42-4.4-.72-8.2-3.38-11.61ZM8.68 14.63c-1.13 0-2.07-1.04-2.07-2.31 0-1.28.91-2.32 2.07-2.32 1.17 0 2.09 1.05 2.07 2.32 0 1.27-.92 2.31-2.07 2.31Zm6.64 0c-1.13 0-2.07-1.04-2.07-2.31 0-1.28.91-2.32 2.07-2.32 1.17 0 2.09 1.05 2.07 2.32 0 1.27-.9 2.31-2.07 2.31Z" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-[17px] fill-current"
    >
      <path d="M21.94 4.66c.3-1.4-.5-1.95-1.73-1.49L2.8 9.88c-1.19.46-1.17 1.12-.2 1.42l4.47 1.4 10.37-6.55c.49-.3.94-.14.57.19l-8.4 7.58-.32 4.52c.47 0 .67-.21.93-.46l2.15-2.08 4.46 3.3c.82.46 1.41.22 1.61-.76l3.5-13.78Z" />
    </svg>
  );
}
