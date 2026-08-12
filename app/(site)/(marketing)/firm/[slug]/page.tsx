import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchDeals, fetchFirms, toFirm } from "@/lib/data/deals";
import { CopyCoupon } from "@/components/deals/copy-coupon";
import { FirmMark } from "@/components/ui/firm-mark";

/**
 * Pre-render every firm page - they are the SEO surface.
 *
 * Built from the live catalogue, so publishing a firm in the console produces
 * its public page on the next build without a code change.
 */
export async function generateStaticParams() {
  const firms = await fetchFirms();
  return firms.map((firm) => ({ slug: firm.slug }));
}

/** One firm, from the catalogue, falling back to the designed set. */
async function getFirmBySlug(slug: string) {
  const deals = await fetchDeals();
  const deal = deals.find((entry) => entry.slug === slug);
  if (deal) return toFirm(deal);

  const firms = await fetchFirms();
  return firms.find((firm) => firm.slug === slug) ?? null;
}

export async function generateMetadata({ params }: PageProps<"/firm/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const firm = await getFirmBySlug(slug);
  if (!firm) return { title: "Firm not found" };
  return {
    title: `${firm.name} - ${firm.cashback}% cashback`,
    description: `Get ${firm.cashback}% cashback and ${firm.discount}% off ${firm.name} challenges with coupon ${firm.coupon}.`,
  };
}

const STEPS = [
  {
    title: (name: string) => `Copy the coupon and open ${name}`,
    body: "Use the button so the referral is tracked to your account.",
  },
  {
    title: () => "Pay with the code applied",
    body: (discount: number) => `You get ${discount}% off immediately at checkout.`,
  },
  {
    title: () => "Submit the order receipt",
    body: () => "Cashback shows as pending, then becomes available after the firm's applicable refund window.",
  },
];

export default async function FirmPage({ params }: PageProps<"/firm/[slug]">) {
  const { slug } = await params;
  const firm = await getFirmBySlug(slug);
  if (!firm) notFound();

  const terms = [
    { label: "RATE", value: `${firm.cashback}% of challenge price` },
    { label: "AVAILABLE AFTER", value: "Refund window" },
    { label: "ELIGIBLE", value: "New challenges & resets" },
    { label: "NOT ELIGIBLE", value: "Refunded orders" },
  ];

  return (
    <div className="mx-auto max-w-[var(--maxw)] px-[var(--pad)] pb-[90px] pt-[clamp(28px,4vw,48px)]">
      <Link
        href="/deals"
        className="mb-[30px] inline-block font-mono text-[10.5px] tracking-[0.14em] text-muted hover:text-fg"
      >
        ← ALL DEALS
      </Link>

      <div className="grid items-start gap-[clamp(28px,4vw,56px)] lg:grid-cols-[1.35fr_.9fr]">
        <div>
          <div className="mb-7 flex items-center gap-[18px]">
            <FirmMark
              name={firm.name}
              mark={firm.mark}
              logoUrl={firm.logoUrl}
              size={60}
              className="rounded-card"
            />
            <div>
              <h1 className="m-0 font-display text-[clamp(26px,3.4vw,40px)] font-black uppercase leading-none tracking-[-0.025em]">
                {firm.name}
              </h1>
              <p className="mt-[7px] font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                {firm.kind} / {firm.platform} / {firm.split} split
              </p>
            </div>
          </div>

          {/* Cover placeholder - swap for real firm artwork (handoff §8). */}
          <div
            className="mb-8 grid h-[180px] place-items-center rounded-card border border-hair"
            style={{
              background:
                "repeating-linear-gradient(135deg, var(--surface) 0 12px, var(--surface-2) 12px 24px)",
            }}
          >
            <span className="rounded-lg bg-bg px-3 py-[7px] font-mono text-[10px] tracking-[0.12em] text-muted">
              FIRM COVER IMAGE
            </span>
          </div>

          <p className="mb-[38px] max-w-[60ch] text-[15.5px] leading-[1.7] text-muted">
            {firm.name} runs {firm.kind.toLowerCase()} evaluations with {firm.payout.toLowerCase()}{" "}
            payouts on {firm.platform}. Traders keep a {firm.split} profit split.
          </p>

          <p className="mb-[18px] font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
            How to get your cashback
          </p>
          <ol className="mb-[38px] flex flex-col">
            {STEPS.map((step, i) => (
              <li
                key={i}
                className="flex gap-5 border-t border-hair-soft py-[19px] last:border-b"
              >
                <span className="pt-[3px] font-mono text-[10.5px] text-primary">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="mb-[5px] text-[14.5px] font-semibold">{step.title(firm.name)}</p>
                  <p className="text-[13px] leading-[1.6] text-muted">
                    {typeof step.body === "function" ? step.body(firm.discount) : step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
            Cashback terms
          </p>
          <div className="grid gap-2.5 md:grid-cols-2">
            {terms.map((term) => (
              <div
                key={term.label}
                className="rounded-[12px] border border-hair bg-surface p-[17px]"
              >
                <p className="mb-2 font-mono text-[9px] tracking-[0.16em] text-muted">
                  {term.label}
                </p>
                <p className="text-sm font-semibold">{term.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sticky action rail. */}
        <aside className="lg:sticky lg:top-24">
          <div
            className="relative rounded-[18px] border bg-surface p-[26px] shadow-card"
            style={{ borderColor: "color-mix(in oklab, var(--primary) 30%, var(--hair))" }}
          >
            <div className="mb-[22px] flex items-end gap-[26px]">
              <div>
                <p className="mb-2 font-mono text-[9px] tracking-[0.18em] text-muted">CASHBACK</p>
                <p
                  data-count
                  className="font-mono text-[32px] leading-none tracking-[-0.03em] text-primary"
                >
                  {firm.cashback}%
                </p>
              </div>
              <div>
                <p className="mb-2 font-mono text-[9px] tracking-[0.18em] text-muted">DISCOUNT</p>
                <p
                  data-count
                  className="font-mono text-[32px] leading-none tracking-[-0.03em] text-muted"
                >
                  {firm.discount}%
                </p>
              </div>
            </div>

            <CopyCoupon code={firm.coupon} />

            {/* Goes through our own tracked redirect, which records the click
                against the signed-in member and attaches their sub-id before
                handing off to the firm. That click is the corroboration for a
                later claim, so linking straight to the firm would throw away
                the evidence that makes a thin report reviewable. */}
            <a
              href={`/go/${firm.slug}?coupon=${encodeURIComponent(firm.coupon)}`}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="block rounded-[11px] bg-primary p-[15px] text-center font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] text-on-primary transition hover:-translate-y-px hover:brightness-[1.08]"
            >
              Buy at {firm.name}
            </a>
            <Link
              href="/dashboard/claim"
              className="mt-[9px] block rounded-[11px] border border-hair p-3.5 text-center font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted transition hover:border-primary hover:text-fg"
            >
              Already bought? Submit the receipt
            </Link>

            <p className="mt-4 text-xs leading-[1.6] text-muted">
              You&rsquo;ll be redirected to {firm.name} with the coupon pre-applied. Cashback tracks
              automatically once you submit the receipt.
            </p>

            <div className="my-[18px] h-px bg-hair-soft" />

            <div className="flex items-center gap-2.5">
              <span className="size-1.5 rounded-[2px] bg-success" />
              <span className="font-mono text-[9.5px] tracking-[0.1em] text-muted">
                COUPON VERIFIED 4H AGO
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
