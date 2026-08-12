import { money } from "@/lib/format";
import { Reveal } from "@/components/ui/reveal";
import { Accent, SectionHeading } from "@/components/ui/section-heading";
import Link from "next/link";

/**
 * An illustrative coupon plus cashback journey.
 *
 * Public copy stays focused on what the trader receives. Reward funding and
 * Jaisara's commercial relationships are disclosed in Terms and Privacy.
 */
const LIST = 129;
const DISCOUNT_PCT = 20;

const discount = (LIST * DISCOUNT_PCT) / 100;
const EXAMPLE_CASHBACK = discount * 0.4;
const youPay = LIST - discount;
const totalReward = discount + EXAMPLE_CASHBACK;

export function Split() {
  return (
    <Reveal className="relative overflow-hidden border-y border-hair bg-surface/35">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-28 -top-44 size-[520px] rounded-full opacity-20 blur-[100px]"
        style={{ background: "var(--primary)" }}
      />

      <div className="relative mx-auto max-w-[var(--maxw)] px-[var(--pad)] py-[clamp(70px,8vw,118px)]">
        <div className="mb-[clamp(34px,5vw,62px)] grid items-end gap-8 lg:grid-cols-[1fr_.82fr]">
          <SectionHeading eyebrow="Your reward">
            <span className="block max-w-[22ch]">
              Save now. <Accent>Earn again.</Accent>
            </span>
          </SectionHeading>

          <div className="border-l border-primary/40 pl-5 lg:pb-1">
            <p className="max-w-[48ch] text-[clamp(15px,1.4vw,17px)] leading-[1.72] text-muted">
              Apply the coupon before checkout. After the purchase is verified, eligible cashback
              moves to your Jaisara wallet.
            </p>
            <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.16em] text-primary">
              Two moments. One deal.
            </p>
          </div>
        </div>

        <div className="grid overflow-hidden rounded-[22px] border border-hair bg-hair shadow-[0_30px_80px_-54px_var(--primary)] md:grid-cols-[1fr_auto_1fr_auto_1.15fr]">
          <RewardFigure label="COUPON SAVING" value={money(discount)} note="OFF AT CHECKOUT" />
          <Symbol>+</Symbol>
          <RewardFigure
            label="CASHBACK"
            value={money(EXAMPLE_CASHBACK)}
            note="40% OF COUPON SAVING"
          />
          <Symbol>=</Symbol>
          <RewardFigure
            label="TOTAL REWARD"
            value={money(totalReward)}
            note={`ON A ${money(LIST)} CHALLENGE`}
            featured
          />
        </div>

        <div className="mt-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <p className="max-w-[72ch] text-[12px] leading-[1.65] text-muted">
            Example only: you pay {money(youPay)} at checkout. Cashback rates and eligibility vary
            by deal and are confirmed after verification.
          </p>
          <Link
            href="/#estimator"
            className="flex-none font-mono text-[10px] uppercase tracking-[0.15em] text-primary hover:underline"
          >
            Calculate yours ↗
          </Link>
        </div>
      </div>
    </Reveal>
  );
}

function RewardFigure({
  label,
  value,
  note,
  featured = false,
}: {
  label: string;
  value: string;
  note: string;
  featured?: boolean;
}) {
  return (
    <div
      className={`flex min-h-[158px] flex-col justify-between p-5 md:min-h-[190px] md:p-7 ${
        featured ? "bg-primary text-on-primary" : "bg-bg"
      }`}
    >
      <span className={`font-mono text-[9px] tracking-[0.18em] ${featured ? "opacity-70" : "text-muted"}`}>
        {label}
      </span>
      <span data-count className="font-mono text-[clamp(30px,4vw,48px)] tracking-[-0.04em]">
        {value}
      </span>
      <span className={`font-mono text-[9px] tracking-[0.12em] ${featured ? "opacity-70" : "text-muted"}`}>
        {note}
      </span>
    </div>
  );
}

function Symbol({ children }: { children: string }) {
  return (
    <div className="grid min-h-10 place-items-center bg-surface-2 font-mono text-lg text-muted md:min-h-full md:w-12">
      {children}
    </div>
  );
}
