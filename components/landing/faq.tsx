"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { FAQS } from "@/lib/data/content";
import { Accent } from "@/components/ui/section-heading";
import { useAssistant } from "@/components/support/assistant-context";

/**
 * FAQ with a sticky intro on the left and single-open accordion on the right.
 * Radix Accordion supplies `aria-expanded` and the disclosure semantics.
 */
export function Faq() {
  const { open: openAssistant } = useAssistant();

  return (
    <section className="mx-auto grid max-w-[var(--maxw)] items-start gap-[clamp(28px,4vw,64px)] px-[var(--pad)] pb-[var(--secpb2)] lg:grid-cols-[1.05fr_.95fr]">
      <div className="lg:sticky lg:top-[118px]">
        <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
          FAQ
        </p>
        <h2 className="mb-4 font-display text-[clamp(24px,3vw,36px)] font-black uppercase leading-[1.02] tracking-[-0.025em]">
          Asked every
          <br />
          single <Accent>day</Accent>.
        </h2>
        <p className="mb-[22px] max-w-[32ch] text-[14.5px] leading-[1.65] text-muted">
          Common questions from traders, answered clearly.
        </p>
        <button
          type="button"
          onClick={openAssistant}
          className="inline-flex cursor-pointer items-center gap-2.5 rounded-[11px] border border-hair px-5 py-[13px] font-mono text-[11px] uppercase tracking-[0.14em] text-muted transition hover:border-primary hover:text-fg"
        >
          Ask the assistant
        </button>
      </div>

      <Accordion.Root type="single" collapsible defaultValue="faq-0">
        {FAQS.map((entry, i) => (
          <Accordion.Item key={entry.question} value={`faq-${i}`}>
            <Accordion.Header>
              <Accordion.Trigger className="group flex w-full cursor-pointer items-start gap-4 border-b border-hair-soft py-5 text-left">
                <span className="flex-1 font-display text-[15.5px] font-bold leading-[1.45] tracking-[-0.01em] text-muted transition-colors group-data-[state=open]:text-fg">
                  {entry.question}
                </span>
                <span className="grid size-[26px] flex-none place-items-center rounded-lg border border-hair font-mono text-[13px] text-muted transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)] group-data-[state=open]:rotate-180">
                  <span className="group-data-[state=open]:hidden">+</span>
                  <span className="hidden group-data-[state=open]:inline">−</span>
                </span>
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="overflow-hidden border-b border-hair-soft">
              <p className="mr-11 pb-5 pt-3 text-sm leading-[1.7] text-muted">{entry.answer}</p>
            </Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    </section>
  );
}
