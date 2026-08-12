import { Reveal } from "@/components/ui/reveal";
import { Accent, SectionHeading } from "@/components/ui/section-heading";
import type { HomepageFeedback } from "@/lib/data/homepage-proof";

/** Approved, source-linked feedback only. Empty means absent, not fabricated. */
export function FeedbackWall({ feedback }: { feedback: HomepageFeedback[] }) {
  if (feedback.length === 0) return null;

  return (
    <Reveal className="mx-auto max-w-[var(--maxw)] px-[var(--pad)] pb-[var(--secpb2)] pt-[var(--secpt)]">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <SectionHeading eyebrow="Trader feedback">
          Shared by <Accent>members</Accent>
        </SectionHeading>
        <p className="max-w-[39ch] text-[13px] leading-6 text-muted">
          Published with a link to the original post so you can read it in context.
        </p>
      </div>

      <div className="mt-[clamp(24px,4vw,38px)] grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {feedback.slice(0, 6).map((item) => (
          <a
            key={item.id}
            href={item.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="group flex min-h-[220px] flex-col overflow-hidden rounded-card border border-hair bg-surface transition duration-300 hover:-translate-y-1 hover:border-primary"
          >
            {item.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- admin-curated URL with no fixed host
              <img
                src={item.imageUrl}
                alt="Screenshot of the original feedback"
                loading="lazy"
                decoding="async"
                className="aspect-[16/9] w-full border-b border-hair object-cover object-top"
              />
            )}
            <div className="flex flex-1 flex-col p-[clamp(18px,2.5vw,24px)]">
              <span aria-hidden className="font-serif text-[36px] leading-none text-primary">“</span>
              <blockquote className="mt-1 line-clamp-6 text-[13.5px] leading-[1.7] text-fg">
                {item.quote}
              </blockquote>
              <div className="mt-auto flex items-center gap-3 pt-5">
                {item.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- admin-curated URL with no fixed host
                  <img
                    src={item.avatarUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="size-9 rounded-full border border-hair object-cover"
                  />
                ) : (
                  <span className="grid size-9 place-items-center rounded-full border border-hair bg-surface-2 font-mono text-[10px] text-muted">
                    {initials(item.authorName)}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-[12.5px]">{item.authorName}</strong>
                  {item.authorHandle && (
                    <span className="mt-0.5 block truncate font-mono text-[9px] tracking-[0.08em] text-muted">
                      {item.authorHandle}
                    </span>
                  )}
                </span>
                <span className="font-mono text-[9px] tracking-[0.12em] text-muted transition group-hover:text-primary">
                  SOURCE ↗
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </Reveal>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
