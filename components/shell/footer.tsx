import Link from "next/link";
import { FooterBand } from "@/components/shell/footer-band";
import { FOOTER_COLUMNS } from "@/lib/nav";
import { Logo } from "@/components/ui/logo";

const SOCIALS = [
  { label: "X", href: "https://x.com" },
  { label: "DC", href: "https://discord.com" },
  { label: "TG", href: "https://telegram.org" },
];

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
            Cashback and referral rewards for prop firm traders. Buy your challenge through Jaisara
            and get paid back on every purchase.
          </p>
          <div className="flex gap-[7px]">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="grid size-8 place-items-center rounded-[9px] border border-hair font-mono text-[9px] text-muted transition hover:border-primary"
              >
                {s.label}
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

      {/* Oversized outlined wordmark — decorative. */}
      <div className="mx-auto max-w-[var(--maxw)] px-[var(--pad)] pt-2.5">
        <p
          aria-hidden="true"
          className="mb-2.5 select-none text-center font-display text-[clamp(44px,13.5vw,186px)] font-black uppercase leading-[0.82] tracking-[-0.02em] text-transparent"
          style={{ WebkitTextStroke: "1px color-mix(in oklab, var(--text) 15%, transparent)" }}
        >
          Jaisara
        </p>
      </div>

      <div className="relative border-t border-hair bg-bg">
        <div className="mx-auto flex max-w-[var(--maxw)] flex-wrap items-center justify-between gap-3 px-[var(--pad)] pb-[22px] pt-[18px]">
          <span className="font-mono text-[9px] tracking-[0.12em] text-muted">
            © 2026 JAISARA — CASHBACK PAID FROM AFFILIATE COMMISSION
          </span>
          <span className="font-mono text-[9px] tracking-[0.12em] text-muted">
            NOT FINANCIAL ADVICE / FIRM NAMES BELONG TO THEIR OWNERS
          </span>
        </div>
      </div>
    </footer>
  );
}
