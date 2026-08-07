import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { apiRequest } from "@/lib/auth-server";
import { MarkdownBody } from "@/components/journal/markdown-body";

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

export default async function JournalPostPage({ params }: PageProps<"/journal/[slug]">) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-[760px] px-[var(--pad)] pb-[70px] pt-[clamp(30px,4vw,52px)]">
      <Link
        href="/journal"
        className="mb-8 inline-block font-mono text-[10.5px] tracking-[0.14em] text-muted hover:text-fg"
      >
        ← JOURNAL
      </Link>

      <p className="mb-4 font-mono text-[9.5px] uppercase tracking-[0.16em] text-primary">
        {post.tags.join(" · ") || "Journal"} · {formatDate(post.publishedAt)}
      </p>
      <h1 className="mb-5 font-display text-[clamp(28px,4.4vw,52px)] font-black uppercase leading-[1] tracking-[-0.025em]">
        {post.title}
      </h1>
      <p className="mb-8 text-[13px] text-muted">
        By {post.author.displayName ?? "Jaisara"}
      </p>

      <div
        className="mb-10 h-[240px] rounded-card border border-hair bg-cover bg-center"
        style={{
          backgroundImage: post.coverUrl
            ? `url("${post.coverUrl.replaceAll('"', "%22")}")`
            : "repeating-linear-gradient(135deg, var(--surface) 0 12px, var(--surface-2) 12px 24px)",
        }}
      />

      <MarkdownBody body={post.body} />
    </article>
  );
}

function formatDate(value?: string | null): string {
  return value
    ? new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(new Date(value))
    : "";
}
