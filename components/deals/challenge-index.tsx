"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ANY_SIZE, type Challenge } from "@/lib/data/firms";
import { FilterChip } from "@/components/ui/filter-chip";
import { FirmMark } from "@/components/ui/firm-mark";
import { moneyCompact, signedMoney } from "@/lib/format";

const SORTS = [
  { key: "cashback", label: "Most back" },
  { key: "price", label: "Cheapest" },
  { key: "size", label: "Largest" },
] as const;

type SortKey = (typeof SORTS)[number]["key"];

const PAGE_SIZE = 20;

/**
 * Every challenge on the site, pooled across firms.
 *
 * This exists because the by-firm view cannot answer the question people
 * actually arrive with. A firm's headline rate is the best of its products, so
 * "FundingPips: 14%" tells you nothing about the $50K account you came for -
 * and comparing two firms on that number can point you at the worse deal.
 * Here every row is a thing you can buy, at its own price and its own rate.
 *
 * Not a separate route. It is the same shopping question as the firm list, and
 * splitting it across two URLs would make somebody choose which page to start
 * on before they know which one answers them.
 *
 * The size filter is not here either - it lives above both views, because it
 * decides what the figures mean rather than which rows survive.
 */
export function ChallengeIndex({
  challenges,
  couponFor,
  discountFor,
  size,
}: {
  /** Already narrowed to the active size basis by the parent. */
  challenges: Challenge[];
  /** A firm's published code, for the tracked link. Empty when it has none. */
  couponFor: (firmSlug: string) => string;
  /** A firm's checkout discount, for the price actually paid. */
  discountFor: (firmSlug: string) => number;
  size: string;
}) {
  const [sort, setSort] = useState<SortKey>("cashback");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const rows = useMemo(
    () =>
      [...challenges].sort((a, b) => {
        if (sort === "price") return a.price - b.price;
        // Nulls last rather than first - a product with no account size is an
        // add-on or a reset, and it should not head a list sorted by size.
        if (sort === "size") return (b.accountSize ?? -1) - (a.accountSize ?? -1);
        return b.cashbackUsd - a.cashbackUsd;
      }),
    [challenges, sort],
  );

  if (challenges.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-hair px-[30px] py-[60px] text-center">
        <p className="mb-3.5 font-mono text-[10px] tracking-[0.2em] text-muted">NOTHING LISTED</p>
        <p className="mb-2 font-display text-[18px] font-bold">
          {size === ANY_SIZE
            ? "No challenges published yet"
            : `Nothing at ${size} right now`}
        </p>
        <p className="text-[13.5px] text-muted">
          {size === ANY_SIZE
            ? "Firms are indexed before their products are. Check the firm list for what is already tracked."
            : "Try another account size, or switch to Any size to see the whole catalogue."}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-muted">Sort</span>
        {SORTS.map((option) => (
          <FilterChip
            key={option.key}
            active={sort === option.key}
            onClick={() => setSort(option.key)}
          >
            {option.label}
          </FilterChip>
        ))}
      </div>

      <div className="overflow-hidden rounded-[18px] border border-hair bg-[linear-gradient(180deg,color-mix(in_oklab,var(--primary)_6%,var(--surface)),var(--surface)_190px)]">
        <div className="hidden grid-cols-[36px_minmax(0,1fr)_76px_104px_112px_88px] gap-x-[clamp(12px,2.2vw,26px)] border-b border-hair bg-[color-mix(in_oklab,var(--surface-2)_70%,transparent)] px-5 py-3 font-mono text-[8.5px] uppercase tracking-[0.16em] text-muted lg:grid">
          <span />
          <span>Firm and challenge</span>
          <span>Size</span>
          <span className="text-right">You pay</span>
          <span className="text-right">You get back</span>
          <span />
        </div>

        {rows.slice(0, visible).map((challenge) => (
          <ChallengeIndexRow
            key={`${challenge.firmSlug}/${challenge.slug}`}
            challenge={challenge}
            coupon={couponFor(challenge.firmSlug)}
            discountPct={discountFor(challenge.firmSlug)}
          />
        ))}
      </div>

      {visible < rows.length && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="cursor-pointer rounded-[10px] border border-hair px-5 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted transition hover:border-primary hover:text-fg"
          >
            Load more ({rows.length - visible} left)
          </button>
        </div>
      )}
    </>
  );
}

function ChallengeIndexRow({
  challenge,
  coupon,
  discountPct,
}: {
  challenge: Challenge;
  coupon: string;
  discountPct: number;
}) {
  const href = coupon
    ? `/go/${challenge.firmSlug}?coupon=${encodeURIComponent(coupon)}`
    : `/go/${challenge.firmSlug}`;

  const pays = discountPct > 0 ? challenge.price * (1 - discountPct / 100) : null;

  return (
    <div className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-[clamp(12px,2.2vw,26px)] gap-y-2 border-b border-hair-soft px-4 py-[14px] transition duration-[250ms] last:border-b-0 hover:bg-[linear-gradient(90deg,color-mix(in_oklab,var(--primary)_8%,transparent),color-mix(in_oklab,var(--surface)_72%,transparent))] md:px-5 lg:grid-cols-[36px_minmax(0,1fr)_76px_104px_112px_88px]">
      <span className="hidden transition-transform duration-300 group-hover:scale-105 lg:block">
        <FirmMark
          name={challenge.firmName}
          mark={challenge.firmMark}
          logoUrl={challenge.firmLogoUrl}
          size={36}
          className="rounded-[10px]"
        />
      </span>

      <div className="min-w-0">
        {/* The firm is the link. Somebody scanning a pooled list needs a way
            back to who is selling this without buying first. */}
        <Link
          href={`/firm/${challenge.firmSlug}`}
          className="truncate font-display text-[15px] font-black uppercase leading-none tracking-[-0.02em] underline-offset-[5px] hover:text-primary hover:underline md:text-[17px]"
        >
          {challenge.firmName}
        </Link>
        <p className="mt-1 truncate text-[12.5px] text-muted">
          {challenge.plan ? (
            <>
              <span className="text-fg">{challenge.plan}</span>
              <span className="px-1.5 text-hair">/</span>
            </>
          ) : null}
          {challenge.name}
        </p>
      </div>

      <span className="hidden font-mono text-[13px] tabular-nums lg:block">
        {challenge.size ?? "—"}
      </span>

      <span className="hidden text-right font-mono tabular-nums lg:block">
        <span className="block text-[13px] text-fg">
          {moneyCompact(pays ?? challenge.price)}
        </span>
        {pays !== null && (
          <span className="block text-[8.5px] tracking-[0.08em] text-muted">
            {moneyCompact(challenge.price)} list
          </span>
        )}
      </span>

      <div className="justify-self-end text-right">
        {challenge.cashbackUsd > 0 ? (
          <>
            <p className="font-mono text-[16px] leading-none tabular-nums tracking-[-0.02em] text-primary md:text-[19px]">
              {signedMoney(challenge.cashbackUsd)}
            </p>
            <p className="mt-1 whitespace-nowrap font-mono text-[8.5px] tracking-[0.12em] text-muted">
              {challenge.cashbackPct}% back
              <span className="lg:hidden">
                {" · "}
                {`${moneyCompact(pays ?? challenge.price)} to buy`}
              </span>
            </p>
          </>
        ) : (
          <p className="whitespace-nowrap font-mono text-[8.5px] tracking-[0.12em] text-muted">
            RATE COMING
          </p>
        )}
      </div>

      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="col-span-2 rounded-[10px] border border-hair px-3 py-2.5 text-center font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted transition hover:border-primary hover:text-fg lg:col-span-1"
      >
        Buy →
      </Link>
    </div>
  );
}
