import Link from "next/link";
import { FIRM_COUNT } from "@/lib/data/firms";
import { CountUp } from "@/components/ui/count-up";
import { ReceiptDeck } from "@/components/receipt/receipt-deck";
import { LiveMarquee } from "@/components/shell/live-marquee";
import { ImpactProvider } from "./impact-context";
import { HeroStage } from "./hero-stage";
import { HeroAtmosphere } from "./hero-atmosphere";
import { HeroGround } from "./hero-ground";

const STATS = [
  { value: 412850, prefix: "$", suffix: "", label: "PAID TO TRADERS" },
  { value: FIRM_COUNT, prefix: "", suffix: "", label: "FIRMS" },
  { value: 9200, prefix: "", suffix: "+", label: "MEMBERS" },
];

/**
 * Landing hero: copy left, receipt right, collapsing to one column below
 * 1180px. Copy here is locked (handoff §3) — the promise is plain "cashback",
 * never "our cut, shared".
 *
 * Layer order is load-bearing. Atmosphere, ground and scrim all paint before
 * the content wrapper and none of them carries a z-index above it, so the copy
 * sits on top by DOM order alone. Give the scrim a z-index and it covers the
 * headline.
 */
export function Hero() {
  return (
    <ImpactProvider>
      <HeroStage>
        <HeroAtmosphere />
        <HeroGround />

        {/* Legibility scrim over the copy column.
            It reaches ~100px above the horizon and is already dense by the
            time it gets there: the horizon line lands within 12px of the CTA
            row, and undamped it cuts straight through "ESTIMATE YOURS". The
            right-hand side stays clear so the receipt still lands on a floor
            you can see. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 h-[calc(var(--groundh)+220px)] w-[min(64%,860px)]"
          style={{
            background:
              "linear-gradient(90deg, color-mix(in oklab, var(--bg) 94%, transparent), color-mix(in oklab, var(--bg) 62%, transparent) 50%, transparent 94%)",
            maskImage: "linear-gradient(to bottom, transparent, #000 24%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent, #000 24%)",
          }}
        />

        <div className="relative mx-auto flex w-full max-w-[var(--maxw)] flex-1 flex-col">
          <div className="grid min-h-0 flex-1 items-center gap-[clamp(30px,5vw,70px)] lg:grid-cols-[1.05fr_.95fr]">
            <div>
              <p className="mb-[clamp(22px,3vw,34px)] font-mono text-[10px] tracking-[0.24em] text-muted [animation:jsUp_.7s_both]">
                PROP FIRM CASHBACK · {FIRM_COUNT} FIRMS INDEXED
              </p>

              <h1 className="mb-[clamp(22px,3vw,32px)] font-display text-[length:var(--display)] font-black uppercase leading-[0.92] tracking-[-0.02em]">
                <span
                  className="block text-transparent [animation:jsUp_.8s_.05s_cubic-bezier(.2,.8,.2,1)_both]"
                  style={{
                    WebkitTextStroke: "1.2px color-mix(in oklab, var(--text) 74%, transparent)",
                  }}
                >
                  Cashback
                </span>
                <span className="block [animation:jsUp_.8s_.15s_cubic-bezier(.2,.8,.2,1)_both]">
                  on every
                </span>
                <span className="block text-primary [animation:jsUp_.8s_.25s_cubic-bezier(.2,.8,.2,1)_both]">
                  challenge
                  <span className="font-serif font-normal normal-case italic tracking-normal">
                    .
                  </span>
                </span>
              </h1>

              <p className="mb-[30px] max-w-[42ch] text-[15.5px] leading-[1.7] text-muted [animation:jsUp_.8s_.34s_both]">
                Use a Jaisara coupon at the firm&rsquo;s checkout: the price drops straight away,
                then we pay you cashback on top. Tracked to the cent, withdrawable in USDT or gift
                cards.
              </p>

              <div className="flex flex-wrap gap-2 [animation:jsUp_.8s_.42s_both] md:gap-2.5">
                {/* On phones the primary CTA takes the full row and the two
                  secondary actions share the next one. */}
                <Link
                  href="/deals"
                  className="flex w-full items-center justify-center gap-2.5 whitespace-nowrap rounded-btn bg-primary px-[26px] py-4 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-on-primary transition hover:-translate-y-0.5 hover:brightness-[1.08] md:w-auto"
                >
                  Start earning<span className="text-sm">↗</span>
                </Link>
                <Link
                  href="/signup"
                  className="flex flex-[1_1_42%] items-center justify-center whitespace-nowrap rounded-btn border px-3.5 py-[15px] font-mono text-[11px] uppercase tracking-[0.15em] transition hover:border-primary md:flex-none md:text-xs"
                  style={{
                    borderColor: "color-mix(in oklab, var(--text) 26%, transparent)",
                    background: "color-mix(in oklab, var(--surface) 62%, transparent)",
                  }}
                >
                  Free account
                </Link>
                <Link
                  href="/#estimator"
                  className="flex flex-[1_1_42%] items-center justify-center gap-2 whitespace-nowrap rounded-btn border px-3 py-[15px] font-mono text-[11px] uppercase tracking-[0.15em] transition hover:border-primary md:flex-none md:text-xs"
                  style={{ borderColor: "color-mix(in oklab, var(--primary) 34%, transparent)" }}
                >
                  <span className="size-1.5 rounded-[2px] bg-primary" />
                  Estimate yours
                </Link>
              </div>

              <dl className="mt-[clamp(30px,4vw,44px)] flex flex-wrap gap-[clamp(24px,3.5vw,44px)] border-t border-hair pt-6 [animation:jsUp_.8s_.5s_both]">
                {STATS.map((stat) => (
                  <div key={stat.label}>
                    <dd className="font-mono text-[21px] tracking-[-0.03em]">
                      <CountUp to={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                    </dd>
                    <dt className="mt-[7px] font-mono text-[9px] tracking-[0.16em] text-muted">
                      {stat.label}
                    </dt>
                  </div>
                ))}
              </dl>
            </div>

            <ReceiptDeck />
          </div>

          <LiveMarquee />
        </div>
      </HeroStage>
    </ImpactProvider>
  );
}
