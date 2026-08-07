import type { Metadata } from "next";
import Link from "next/link";
import { fetchStats } from "@/lib/data/deals";
import { CountUp } from "@/components/ui/count-up";

export const metadata: Metadata = {
  title: "About",
  description: "Why Jaisara exists, and how the commission is split.",
};

const TEAM = [
  { initials: "RS", name: "Rahul S.", role: "Product" },
  { initials: "AM", name: "Ava M.", role: "Partnerships" },
  { initials: "DK", name: "Dev K.", role: "Engineering" },
  { initials: "MN", name: "Meera N.", role: "Support" },
];

const PRINCIPLES = [
  {
    title: "The commission already exists",
    body: "Firms budget acquisition into every challenge price. We did not create that money — we just refuse to keep all of it.",
  },
  {
    title: "Say the number",
    body: "Every rate, every deduction and every clearing period is printed before you buy. No 'up to' figures.",
  },
  {
    title: "Referrals never cost the referred",
    body: "Club rewards come out of our share. The person you invited always gets the full advertised rate.",
  },
];

export default async function AboutPage() {
  const stats = await fetchStats();
  return (
    <div className="mx-auto max-w-[var(--maxw)] px-[var(--pad)] pb-[60px] pt-[clamp(40px,6vw,76px)]">
      <p className="mb-3.5 font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
        [ About ]
      </p>
      <h1 className="mb-6 max-w-[18ch] font-display text-[clamp(32px,5vw,64px)] font-black uppercase leading-[0.96] tracking-[-0.025em]">
        We give back the{" "}
        <span className="font-serif font-normal normal-case italic tracking-normal text-primary">
          cut.
        </span>
      </h1>
      <p className="mb-12 max-w-[58ch] text-[16.5px] leading-[1.7] text-muted">
        Jaisara is a cashback platform for prop firm traders. We hold coupon deals with{" "}
        {stats.firmCount} firms, and when you buy through one, most of the commission comes back to you
        instead of staying with a comparison site.
      </p>

      <dl className="mb-14 flex flex-wrap gap-[clamp(24px,4vw,64px)] border-y border-hair py-8">
        {[
          { value: 412850, prefix: "$", suffix: "", label: "PAID TO TRADERS" },
          { value: stats.firmCount, prefix: "", suffix: "", label: "FIRMS INDEXED" },
          { value: 9200, prefix: "", suffix: "+", label: "MEMBERS" },
        ].map((stat) => (
          <div key={stat.label}>
            <dd className="font-mono text-[clamp(24px,3vw,34px)] tracking-[-0.03em]">
              <CountUp to={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
            </dd>
            <dt className="mt-2 font-mono text-[9px] tracking-[0.16em] text-muted">{stat.label}</dt>
          </div>
        ))}
      </dl>

      <h2 className="mb-6 font-display text-[clamp(22px,3vw,34px)] font-black uppercase tracking-[-0.02em]">
        How we operate
      </h2>
      <div className="mb-14 grid gap-px overflow-hidden rounded-card border border-hair bg-hair md:grid-cols-3">
        {PRINCIPLES.map((principle, i) => (
          <div key={principle.title} className="bg-bg p-[clamp(20px,3vw,26px)]">
            <p className="mb-4 font-mono text-[10.5px] text-primary">
              {String(i + 1).padStart(2, "0")}
            </p>
            <h3 className="mb-2 font-display text-[17px] font-bold tracking-[-0.015em]">
              {principle.title}
            </h3>
            <p className="text-[13.5px] leading-[1.65] text-muted">{principle.body}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-6 font-display text-[clamp(22px,3vw,34px)] font-black uppercase tracking-[-0.02em]">
        The desk
      </h2>
      <div className="mb-14 flex flex-wrap gap-8">
        {TEAM.map((person) => (
          <div key={person.initials} className="flex items-center gap-3.5">
            <span
              className="grid size-12 place-items-center rounded-full font-mono text-[13px] text-primary"
              style={{ background: "color-mix(in oklab, var(--primary) 16%, var(--surface-2))" }}
            >
              {person.initials}
            </span>
            <div>
              <p className="text-sm font-semibold">{person.name}</p>
              <p className="mt-0.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted">
                {person.role}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2.5">
        <Link
          href="/deals"
          className="rounded-btn bg-primary px-6 py-4 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-on-primary transition hover:-translate-y-0.5 hover:brightness-[1.08]"
        >
          Browse the deals ↗
        </Link>
        <Link
          href="/journal"
          className="rounded-btn border border-hair px-6 py-4 font-mono text-xs uppercase tracking-[0.15em] text-muted transition hover:border-primary hover:text-fg"
        >
          Read the journal
        </Link>
      </div>
    </div>
  );
}
