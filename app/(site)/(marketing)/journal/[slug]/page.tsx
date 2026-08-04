import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ARTICLE, POSTS, getPost } from "@/lib/data/journal";

export function generateStaticParams() {
  return POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/journal/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Post not found" };
  return { title: post.title, description: post.excerpt };
}

export default async function JournalPostPage({ params }: PageProps<"/journal/[slug]">) {
  const { slug } = await params;
  const post = getPost(slug);
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
        {post.category} · {post.readingTime} · {post.date}
      </p>
      <h1 className="mb-8 font-display text-[clamp(28px,4.4vw,52px)] font-black uppercase leading-[1] tracking-[-0.025em]">
        {post.title}
      </h1>

      <div
        className="mb-10 h-[240px] rounded-card border border-hair"
        style={{
          background:
            "repeating-linear-gradient(135deg, var(--surface) 0 12px, var(--surface-2) 12px 24px)",
        }}
      />

      {ARTICLE.map((block, i) => {
        if (block.type === "h") {
          return (
            <h2
              key={i}
              className="mb-3 mt-9 font-display text-[20px] font-bold tracking-[-0.015em]"
            >
              {block.text}
            </h2>
          );
        }
        if (block.type === "quote") {
          return (
            <blockquote
              key={i}
              className="my-8 border-l-2 border-primary pl-5 font-serif text-[clamp(20px,2.6vw,28px)] italic leading-[1.35] text-primary"
            >
              {block.text}
            </blockquote>
          );
        }
        return (
          <p key={i} className="mb-5 text-[16.5px] leading-[1.75] text-muted">
            {block.text}
          </p>
        );
      })}

      <div className="mt-12 border-t border-hair pt-8">
        <p className="mb-3 font-mono text-[9.5px] tracking-[0.16em] text-muted">NEXT UP</p>
        <div className="flex flex-col gap-3">
          {POSTS.filter((other) => other.slug !== post.slug)
            .slice(0, 2)
            .map((other) => (
              <Link
                key={other.slug}
                href={`/journal/${other.slug}`}
                className="font-display text-[17px] font-bold tracking-[-0.015em] text-fg hover:text-primary"
              >
                {other.title}
              </Link>
            ))}
        </div>
      </div>
    </article>
  );
}
