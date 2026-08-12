import type { LegalDocument } from "@/lib/data/legal";

/** Shared layout for Terms and Privacy - a single readable column. */
export function LegalPage({ document }: { document: LegalDocument }) {
  return (
    <div className="mx-auto max-w-[800px] px-[var(--pad)] pb-[90px] pt-[clamp(40px,6vw,68px)]">
      <p className="mb-3.5 font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
        [ Legal ]
      </p>
      <h1 className="mb-4 font-display text-[clamp(28px,4vw,44px)] font-black uppercase leading-none tracking-[-0.025em]">
        {document.title}
      </h1>
      <p className="mb-10 text-[15px] leading-[1.7] text-muted">{document.intro}</p>

      <div className="flex flex-col">
        {document.sections.map((section) => (
          <section key={section.heading} className="border-t border-hair-soft py-6">
            <h2 className="mb-2.5 font-display text-[16px] font-bold tracking-[-0.01em]">
              {section.heading}
            </h2>
            <p className="text-sm leading-[1.75] text-muted">{section.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
