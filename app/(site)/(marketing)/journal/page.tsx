import type { Metadata } from "next";
import Link from "next/link";
import { apiRequest } from "@/lib/auth-server";

export const metadata: Metadata = {
  title: "Journal",
  description: "Explainers, guides and product notes on prop firm cashback.",
};

interface JournalPost {
  slug: string;
  title: string;
  excerpt?: string | null;
  coverUrl?: string | null;
  tags: string[];
  publishedAt?: string | null;
  readMinutes: number;
  author: { displayName?: string | null };
}

async function posts(): Promise<JournalPost[]> {
  try {
    const response = await apiRequest("/journal?take=50");
    return response.ok ? ((await response.json()) as JournalPost[]) : [];
  } catch {
    return [];
  }
}

export default async function JournalPage() {
  const [featured, ...rest] = await posts();

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

      {!featured ? (
        <div className="rounded-card border border-hair bg-surface px-6 py-16 text-center">
          <p className="font-display text-xl font-bold uppercase">The journal is quiet</p>
          <p className="mt-3 text-sm text-muted">Published notes will appear here.</p>
        </div>
      ) : (
        <>
          <Link
            href={`/journal/${featured.slug}`}
            className="group mb-10 grid gap-6 border-t border-hair pt-8 text-fg lg:grid-cols-[1.2fr_1fr]"
          >
            <Cover post={featured} className="h-[220px] lg:order-2 lg:h-full lg:min-h-[220px]" />
            <div className="lg:order-1">
              <p className="mb-3 font-mono text-[9.5px] uppercase tracking-[0.16em] text-primary">
                {featured.tags[0] ?? "Journal"} · {readTime(featured.readMinutes)} ·{" "}
                {formatDate(featured.publishedAt)}
              </p>
              <h2 className="mb-3 font-display text-[clamp(22px,3vw,34px)] font-black uppercase leading-[1.02] tracking-[-0.02em] group-hover:text-primary">
                {featured.title}
              </h2>
              <p className="max-w-[54ch] text-sm leading-[1.7] text-muted">
                {featured.excerpt}
              </p>
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
                  {post.tags[0] ?? "Journal"} · {readTime(post.readMinutes)}
                </p>
                <h2 className="mb-2 font-display text-[17px] font-bold leading-[1.3] tracking-[-0.015em] group-hover:text-primary">
                  {post.title}
                </h2>
                <p className="mb-3 text-[13px] leading-[1.65] text-muted">{post.excerpt}</p>
                <p className="font-mono text-[9px] tracking-[0.12em] text-muted">
                  {formatDate(post.publishedAt).toUpperCase()}
                </p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Cover({ post, className }: { post: JournalPost; className: string }) {
  return (
    <div
      className={`rounded-card border border-hair bg-cover bg-center ${className}`}
      style={{
        backgroundImage: post.coverUrl
          ? `url("${post.coverUrl.replaceAll('"', "%22")}")`
          : "repeating-linear-gradient(135deg, var(--surface) 0 12px, var(--surface-2) 12px 24px)",
      }}
    />
  );
}

function formatDate(value?: string | null): string {
  return value
    ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value))
    : "Draft";
}

/** The API does the counting - see `readMinutes` in post.controller.ts. */
function readTime(minutes: number): string {
  return `${minutes} min read`;
}
