import Link from "next/link";
import type { PublicStats } from "@/lib/data/deals";
import type { Receipt } from "@/lib/data/receipts";
import { CountUp } from "@/components/ui/count-up";
import { ReceiptDeck } from "@/components/receipt/receipt-deck";
import { LiveMarquee } from "@/components/shell/live-marquee";
import { ImpactProvider } from "./impact-context";
import { HeroStage } from "./hero-stage";
import { HeroAtmosphere } from "./hero-atmosphere";
import { HeroWatermark } from "./hero-watermark";
import { HeroGround } from "./hero-ground";
import { HEADER_COUPON } from "@/lib/nav";

/**
 * The three figures under the headline, from the ledger and the catalogue.
 *
 * "Paid to traders" counts cleared cashback only - quoting pending amounts as
 * paid would be a marketing claim the ledger cannot back up.
 */
function statsFor(stats?: PublicStats) {
  return [
    {
      value: Math.round(Number(stats?.paidToTradersUsd ?? 0)),
      prefix: "$",
      suffix: "",
      label: "PAID TO TRADERS",
    },
    { value: stats?.firmCount ?? 0, prefix: "", suffix: "", label: "FIRMS" },
    { value: stats?.memberCount ?? 0, prefix: "", suffix: "+", label: "MEMBERS" },
  ];
}

/**
 * Landing hero: copy left, receipt right, collapsing to one column below
 * 1180px. The promise is deliberately benefit-led: the coupon discount is the
 * firm's, and the cashback is what Jaisara adds on top of it.
 *
 * Layer order is load-bearing. Watermark, atmosphere, ground and scrim all paint before
 * the content wrapper and none of them carries a z-index above it, so the copy
 * sits on top by DOM order alone. Give the scrim a z-index and it covers the
 * headline.
 */
export function Hero({
  receipts,
  marquee,
  stats,
}: {
  receipts?: Receipt[];
  marquee?: string[];
  stats?: PublicStats;
}) {
  return (
    <ImpactProvider>
      <HeroStage>
        {/* Before the atmosphere, not after: the grid and the motes have to
            pass in front of the mark or it reads as a decal on the glass.
            See the note in hero-watermark.tsx. */}
        <HeroWatermark />
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
          <div className="grid min-h-0 flex-1 items-center gap-[clamp(30px,4vw,62px)] lg:grid-cols-[1.12fr_.88fr]">
            <div className="max-w-[720px]">
              {/* The kicker. It gives the headline something to sit against -
                  a display line starting hard at the top of the column had
                  nothing to establish the voice first - and it says the two
                  halves of the offer in four words before the headline says
                  them in six. */}
              <p className="mb-[clamp(14px,1.6vw,20px)] flex items-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.24em] text-muted [animation:jsUp_.8s_both]">
                <span className="size-1.5 flex-none rounded-[2px] bg-primary" />
                Smarter deals. <span className="text-primary">Real cashback.</span>
              </p>

              {/* Three lines now rather than two, which is why `--display` is
                  smaller than it was for "Save twice." - at the old desktop
                  size this headline alone stood 310px tall and left the
                  receipt column looking like a footnote. */}
              <h1 className="mb-[clamp(20px,2.6vw,28px)] font-display text-[length:var(--display)] font-black uppercase leading-[0.94] tracking-[-0.02em]">
                <span
                  className="block text-transparent [animation:jsUp_.8s_.05s_cubic-bezier(.2,.8,.2,1)_both]"
                  style={{
                    WebkitTextStroke: "1.2px color-mix(in oklab, var(--text) 74%, transparent)",
                  }}
                >
                  Cashback on
                </span>
                <span className="block [animation:jsUp_.8s_.15s_cubic-bezier(.2,.8,.2,1)_both]">
                  <span className="text-primary">every</span> prop firm
                </span>
                <span className="block [animation:jsUp_.8s_.22s_cubic-bezier(.2,.8,.2,1)_both]">
                  purchase
                  <span className="font-serif font-normal normal-case italic tracking-normal text-primary">
                    .
                  </span>
                </span>
              </h1>

              {/* The code is read from `lib/nav.ts`, the same constant the
                  navbar pill copies to the clipboard. Two places printing the
                  code from two sources is how a campaign ships a coupon the
                  copy button does not hand out. */}
              <p className="mb-[30px] max-w-[46ch] text-[clamp(16px,1.5vw,19px)] leading-[1.62] text-muted [animation:jsUp_.8s_.3s_both]">
                Always use code{" "}
                <span className="font-mono font-medium tracking-[0.04em] text-primary">
                  {HEADER_COUPON}
                </span>{" "}
                at checkout. You keep the firm&rsquo;s existing discount, and we pay you cashback on
                top of it.
              </p>

              <div className="flex flex-wrap gap-2.5 [animation:jsUp_.8s_.4s_both]">
                <Link
                  href="/deals"
                  className="flex w-full items-center justify-center gap-2.5 whitespace-nowrap rounded-btn bg-primary px-[26px] py-4 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-on-primary transition hover:-translate-y-0.5 hover:brightness-[1.08] md:w-auto"
                >
                  Browse deals<span className="text-sm">↗</span>
                </Link>
                <Link
                  href="/#estimator"
                  className="flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-btn border px-5 py-[15px] font-mono text-[11px] uppercase tracking-[0.15em] transition hover:border-primary md:w-auto md:text-xs"
                  style={{ borderColor: "color-mix(in oklab, var(--primary) 34%, transparent)" }}
                >
                  <span className="size-1.5 rounded-[2px] bg-primary" />
                  Estimate cashback
                </Link>
              </div>

              <dl className="mt-[clamp(30px,4vw,44px)] flex flex-wrap gap-[clamp(24px,3.5vw,44px)] border-t border-hair pt-6 [animation:jsUp_.8s_.5s_both]">
                {statsFor(stats).map((stat) => (
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

            <ReceiptDeck receipts={receipts} />
          </div>

          <LiveMarquee lines={marquee} />
        </div>
      </HeroStage>
    </ImpactProvider>
  );
}
