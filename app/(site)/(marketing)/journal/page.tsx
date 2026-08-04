import type { Metadata } from "next";
import Link from "next/link";
import { POSTS } from "@/lib/data/journal";

export const metadata: Metadata = {
  title: "Journal",
  description: "Explainers, guides and product notes on prop firm cashback.",
};

export default function JournalPage() {
  const [featured, ...rest] = POSTS;

  return (
    <div className="mx-auto max-w-[var(--maxw)] px-[var(--pad)] pb-[70px] pt-[clamp(40px,6vw,72px)]">
      <p className="mb-3.5 font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
        [ Journal ]
      </p>
      <h1 className="mb-10 font-display text-[clamp(32px,5vw,64px)] font-black uppercase leading-[0.96] tracking-[-0.025em]">
        Notes from
        <br />
        <span className="font-serif font-normal normal-case italic tracking-normal text-primary">
          the desk.
        </span>
      </h1>

      <Link
        href={`/journal/${featured.slug}`}
        className="group mb-10 grid gap-6 border-t border-hair pt-8 text-fg lg:grid-cols-[1.2fr_1fr]"
      >
        <div
          className="h-[220px] rounded-card border border-hair lg:order-2 lg:h-full lg:min-h-[220px]"
          style={{
            background:
              "repeating-linear-gradient(135deg, var(--surface) 0 12px, var(--surface-2) 12px 24px)",
          }}
        />
        <div className="lg:order-1">
          <p className="mb-3 font-mono text-[9.5px] uppercase tracking-[0.16em] text-primary">
            {featured.category} · {featured.readingTime} · {featured.date}
          </p>
          <h2 className="mb-3 font-display text-[clamp(22px,3vw,34px)] font-black uppercase leading-[1.02] tracking-[-0.02em] group-hover:text-primary">
            {featured.title}
          </h2>
          <p className="max-w-[54ch] text-sm leading-[1.7] text-muted">{featured.excerpt}</p>
        </div>
      </Link>

      <div className="grid gap-x-8 md:grid-cols-2 lg:grid-cols-3">
        {rest.map((post) => (
          <Link
            key={post.slug}
            href={`/journal/${post.slug}`}
            className="group border-t border-hair-soft py-6 text-fg"
          >
            <p className="mb-2.5 font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
              {post.category} · {post.readingTime}
            </p>
            <h2 className="mb-2 font-display text-[17px] font-bold leading-[1.3] tracking-[-0.015em] group-hover:text-primary">
              {post.title}
            </h2>
            <p className="mb-3 text-[13px] leading-[1.65] text-muted">{post.excerpt}</p>
            <p className="font-mono text-[9px] tracking-[0.12em] text-muted">
              {post.date.toUpperCase()}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
