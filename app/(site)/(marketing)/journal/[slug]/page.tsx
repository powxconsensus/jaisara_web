import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { apiRequest } from "@/lib/auth-server";
import { MarkdownBody } from "@/components/journal/markdown-body";
import { BrandMark } from "@/components/ui/brand-mark";

interface JournalPost {
  slug: string;
  title: string;
  excerpt?: string | null;
  body: string;
  coverUrl?: string | null;
  tags: string[];
  publishedAt?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  readMinutes: number;
  author: { displayName?: string | null };
}

async function getPost(slug: string): Promise<JournalPost | null> {
  try {
    const response = await apiRequest(`/journal/${encodeURIComponent(slug)}`);
    return response.ok ? ((await response.json()) as JournalPost) : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: PageProps<"/journal/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Post not found" };
  return {
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt || undefined,
  };
}

/**
 * A published journal post.
 *
 * ── The measure ───────────────────────────────────────────────────────────
 * The column is 860px, not the 760px it was and not the "50-60% of the
 * viewport" that a wide screen would allow. Line length is what makes prose
 * readable, and past roughly 80 characters the eye loses its place coming back
 * to the left margin - on a 1920px display, 60% would be 1150px and about 110
 * characters a line. Medium, for reference, runs about 700px.
 *
 * So the width went up *and* the body type went up with it (see
 * `markdown-body.tsx`), which is what keeps this at ~78 characters while
 * reading considerably larger than before. Widen it further only by raising
 * the type size to match.
 */
export default async function JournalPostPage({ params }: PageProps<"/journal/[slug]">) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  return (
    <div className="relative overflow-hidden">
      {/* The backdrop. Two washes rather than one flat tint: an accent bloom
          behind the masthead and a surface gradient that fades out by the time
          the body starts, so the headline sits on colour and the prose sits on
          the page background where it is easiest to read. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[720px]"
        style={{
          background:
            "linear-gradient(to bottom, color-mix(in oklab, var(--surface) 78%, var(--primary)), color-mix(in oklab, var(--surface) 40%, transparent) 46%, transparent)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 size-[620px] -translate-x-1/2 rounded-full opacity-[0.14] blur-[130px]"
        style={{ background: "var(--primary)" }}
      />

      <article className="relative mx-auto max-w-[860px] px-[var(--pad)] pb-[90px] pt-[clamp(28px,4vw,48px)]">
        <Link
          href="/journal"
          className="mb-9 inline-block font-mono text-[10.5px] tracking-[0.14em] text-muted transition hover:text-fg"
        >
          ← JOURNAL
        </Link>

        <p className="mb-4 font-mono text-[9.5px] uppercase tracking-[0.16em] text-primary">
          {[
            post.tags.join(" · ") || "Journal",
            formatDate(post.publishedAt),
            `${post.readMinutes} min read`,
          ]
            .filter(Boolean)
            .join("  ·  ")}
        </p>

        <h1 className="mb-6 font-display text-[clamp(30px,4.6vw,54px)] font-black uppercase leading-[1] tracking-[-0.025em]">
          {post.title}
        </h1>

        {post.excerpt ? (
          <p className="mb-7 max-w-[62ch] font-serif text-[clamp(18px,2vw,22px)] italic leading-[1.5] text-muted">
            {post.excerpt}
          </p>
        ) : null}

        <p className="mb-9 border-t border-hair pt-5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
          By {post.author.displayName ?? "Jaisara"}
        </p>

        <Cover url={post.coverUrl} />

        <MarkdownBody body={post.body} />

        <div className="mt-14 border-t border-hair pt-7">
          <Link
            href="/deals"
            className="inline-flex items-center gap-2 rounded-btn bg-primary px-[22px] py-3.5 font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-on-primary transition hover:brightness-[1.08]"
          >
            Browse deals<span className="text-sm">↗</span>
          </Link>
        </div>
      </article>
    </div>
  );
}

/**
 * The masthead image, or something deliberate in its place.
 *
 * Most posts have no `coverUrl`, and the old fallback was a diagonal stripe
 * pattern - fine as a 240px band, but at the width this page now runs it fills
 * half a screen and reads as a broken image. A post without artwork gets a
 * shallower branded panel instead, which looks like a decision rather than an
 * omission.
 */
function Cover({ url }: { url?: string | null }) {
  if (url) {
    return (
      <div
        className="mb-11 aspect-[16/7] w-full rounded-card border border-hair bg-cover bg-center"
        style={{ backgroundImage: `url("${url.replaceAll('"', "%22")}")` }}
      />
    );
  }

  return (
    <div
      className="relative mb-11 grid aspect-[16/5] w-full place-items-center overflow-hidden rounded-card border border-hair"
      style={{
        background:
          "linear-gradient(135deg, color-mix(in oklab, var(--surface) 88%, var(--primary)), var(--surface-2))",
      }}
    >
      {/* aspect-square, not just a width: the mark is a mask on an otherwise
          empty span, so without it the element has no height to paint into. */}
      <BrandMark className="aspect-square w-[26%] max-w-[180px] text-primary opacity-[0.18]" />
    </div>
  );
}

function formatDate(value?: string | null): string {
  return value
    ? new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(new Date(value))
    : "";
}
