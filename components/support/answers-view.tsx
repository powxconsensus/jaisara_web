"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  supportApi,
  SupportError,
  type HelpArticleSummary,
  type QuickOption,
} from "./support-api";
import { ErrorNote, Scroller, Skeleton } from "./widget-ui";

/**
 * The answers index.
 *
 * Two kinds of thing live here and they behave differently on purpose. A
 * **question** expands in place, because its answer is short, specific to this
 * member, and reading it should not cost a screen transition. A **guide** is a
 * published article — long enough to deserve its own view.
 *
 * The answers themselves come from the member's own rows, fetched when the row
 * is opened rather than up front: six answers is six queries against claims,
 * payouts and the ledger, and most members open one.
 *
 * "Did that help? / No — ask a human" is the deflection gate. It is the honest
 * version of a contact button: offered *after* an answer, so the conversation
 * it starts already carries what was tried.
 */

interface Answer {
  body: string;
  action: { label: string; href: string } | null;
}

export function AnswersView({
  signedIn,
  openTopic,
  setOpenTopic,
  onAskHuman,
  onOpenGuide,
}: {
  signedIn: boolean;
  /** Lifted, so a question picked on Home is already open when you land here. */
  openTopic: string | null;
  setOpenTopic: (topic: string | null) => void;
  onAskHuman: (question: string) => void;
  onOpenGuide: (slug: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<QuickOption[]>([]);
  const [guides, setGuides] = useState<HelpArticleSummary[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, Answer | "loading" | "error">>({});

  /**
   * The question list loads signed out too.
   *
   * The questions are public — it is only the *answers* that are personal. A
   * signed-out visitor should still see that "why was my claim rejected?" is
   * something this desk handles; hiding the list makes the panel look empty at
   * exactly the moment somebody is deciding whether to sign up.
   */
  const loadOptions = useCallback(async () => {
    try {
      setOptions((await supportApi.options()).options);
    } catch {
      // The guides alone are still a useful screen.
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the setState is inside loadOptions, behind an await
    void loadOptions();
  }, [loadOptions]);

  // Debounced: typing "cashback" is one request, not eight.
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(
      () => {
        void supportApi
          .helpArticles(query.trim() || undefined)
          .then((result) => {
            if (!controller.signal.aborted) setGuides(result);
          })
          .catch(() => {
            if (!controller.signal.aborted) setGuides([]);
          });
      },
      query ? 250 : 0,
    );

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  const toggle = async (option: QuickOption) => {
    if (openTopic === option.topic) {
      setOpenTopic(null);
      return;
    }

    setOpenTopic(option.topic);
    if (!signedIn) return;
    if (answers[option.topic] && answers[option.topic] !== "error") return;

    setAnswers((prev) => ({ ...prev, [option.topic]: "loading" }));
    try {
      // Always `asking`: this expands one answer in place, outside any
      // conversation, so it must never advance a conversation's stage.
      const reply = await supportApi.chat({ topic: option.topic, stage: "asking", history: [] });
      setAnswers((prev) => ({
        ...prev,
        [option.topic]: { body: reply.body, action: reply.action },
      }));
    } catch (caught) {
      setAnswers((prev) => ({ ...prev, [option.topic]: "error" }));
      if (!(caught instanceof SupportError)) throw caught;
    }
  };

  const needle = query.trim().toLowerCase();
  // Matches the category too, so "money" finds the whole group — the design
  // searches question, answer and category together.
  const matched = needle
    ? options.filter((option) =>
        `${option.label} ${option.category}`.toLowerCase().includes(needle),
      )
    : options;

  const grouped = matched.reduce<Record<string, QuickOption[]>>((groups, option) => {
    (groups[option.category] ??= []).push(option);
    return groups;
  }, {});

  const nothingMatches = needle.length > 0 && matched.length === 0 && (guides?.length ?? 0) === 0;

  return (
    <Scroller className="px-[17px] pb-5 pt-4">
      <div className="relative mb-4">
        <label htmlFor="support-search" className="sr-only">
          Search or describe the problem
        </label>
        <input
          id="support-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search or describe the problem"
          className="w-full rounded-xl border border-hair bg-surface-2 py-[13px] pl-[38px] pr-[13px] text-[13.5px] outline-none transition-colors focus:border-primary"
        />
        {/* Drawn rather than an icon font — one ring and one stroke, so it
            inherits the muted colour exactly like the design specifies. */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-[15px] top-[14.5px] size-[11px] rounded-full border-[1.6px] border-muted"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute left-[25px] top-[25px] h-[1.6px] w-[6px] origin-left rotate-45 bg-muted"
        />
      </div>

      {Object.entries(grouped).map(([category, rows]) => (
        <div key={category}>
          <p className="px-0.5 pb-0.5 pt-[18px] font-mono text-[9.5px] tracking-[0.2em] text-muted">
            [ {category} ]
          </p>
          {rows.map((option) => {
            const open = openTopic === option.topic;
            const answer = answers[option.topic];

            return (
              <div key={option.topic} className="border-b border-hair-soft">
                <button
                  type="button"
                  onClick={() => void toggle(option)}
                  aria-expanded={open}
                  className="flex min-h-[46px] w-full cursor-pointer items-center gap-3 py-3.5 text-left"
                >
                  <span
                    className={`flex-1 text-sm leading-[1.4] transition-colors ${open ? "text-primary" : ""}`}
                  >
                    {option.label}
                  </span>
                  {/* Primary while closed — it is the invitation. Muted once
                      open, because the answer below it is now the thing to
                      read and "CLOSE" should not compete with it. */}
                  <span
                    className={`flex-none font-mono text-[9px] tracking-[0.14em] transition-colors ${
                      open ? "text-muted" : "text-primary"
                    }`}
                  >
                    {open ? "CLOSE" : "ANSWER"}
                  </span>
                </button>

                {open && (
                  <div className="px-0.5 pb-1.5 [animation:jsUp_.3s_cubic-bezier(.2,.8,.2,1)_both]">
                    {!signedIn ? (
                      <p className="pb-3.5 text-[13.2px] leading-[1.72] text-muted">
                        This one is answered from your own claims and payouts — sign in and it
                        fills in with your figures.
                      </p>
                    ) : answer === "loading" || answer === undefined ? (
                      <p className="pb-3.5 text-[13.2px] leading-[1.72] text-muted">Checking…</p>
                    ) : answer === "error" ? (
                      <p className="pb-3.5 text-[13.2px] leading-[1.72] text-danger">
                        That could not be looked up just now.
                      </p>
                    ) : (
                      <>
                        <p className="whitespace-pre-line pb-3.5 text-[13.2px] leading-[1.72] text-muted">
                          {answer.body}
                        </p>
                        {answer.action && (
                          <Link
                            href={answer.action.href}
                            className="mb-3 inline-block border-b pb-0.5 font-mono text-[9px] uppercase tracking-[0.13em] text-primary"
                            style={{
                              borderColor: "color-mix(in oklab, var(--primary) 45%, transparent)",
                            }}
                          >
                            {answer.action.label} →
                          </Link>
                        )}
                      </>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pb-[15px]">
                      <span className="mr-0.5 font-mono text-[9px] tracking-[0.13em] text-muted">
                        DID THAT HELP?
                      </span>
                      <button
                        type="button"
                        onClick={() => setOpenTopic(null)}
                        className="cursor-pointer rounded-[7px] border border-hair px-3 py-[7px] font-mono text-[9px] tracking-[0.13em] text-muted transition hover:border-success hover:text-success"
                      >
                        YES
                      </button>
                      <button
                        type="button"
                        onClick={() => onAskHuman(option.label)}
                        className="cursor-pointer rounded-[7px] border border-hair px-3 py-[7px] font-mono text-[9px] tracking-[0.13em] text-muted transition hover:border-primary hover:text-primary"
                      >
                        NO — ASK A HUMAN
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {guides === null ? (
        <Skeleton rows={2} />
      ) : guides.length > 0 ? (
        <>
          <p className="px-0.5 pb-2.5 pt-[22px] font-mono text-[9.5px] tracking-[0.2em] text-muted">
            [ LONGER READS ]
          </p>
          <div className="flex flex-col gap-2">
            {guides.map((guide) => (
              <button
                key={guide.slug}
                type="button"
                onClick={() => onOpenGuide(guide.slug)}
                className="flex cursor-pointer items-center gap-3 rounded-[13px] bg-surface-2 px-4 py-[15px] text-left transition hover:translate-x-[3px]"
              >
                <span className="min-w-0 flex-1">
                  <span className="mb-[5px] block font-display text-sm font-semibold">
                    {guide.title}
                  </span>
                  {guide.excerpt && (
                    <span className="block text-[12.3px] leading-[1.55] text-muted">
                      {guide.excerpt}
                    </span>
                  )}
                </span>
                <span className="flex-none text-sm text-muted">›</span>
              </button>
            ))}
          </div>
        </>
      ) : null}

      {nothingMatches && (
        <div className="mt-1.5 rounded-[14px] bg-surface-2 px-[18px] py-5 text-center [animation:jsUp_.42s_cubic-bezier(.2,.8,.2,1)_both]">
          <p className="mb-2.5 font-mono text-[9.5px] tracking-[0.2em] text-muted">
            NO MATCH IN THE INDEX
          </p>
          <p className="mb-[17px] text-[13.5px] leading-[1.6]">
            Tell the desk in your own words — the assistant will try first, and pass it to a person
            if it can&rsquo;t settle it.
          </p>
          <button
            type="button"
            onClick={() => onAskHuman(query.trim())}
            className="inline-flex cursor-pointer items-center gap-2 rounded-[11px] bg-primary px-5 py-3 font-mono text-[10px] tracking-[0.15em] text-on-primary transition hover:brightness-[1.07]"
          >
            ASK THE DESK →
          </button>
        </div>
      )}

      {guides !== null && guides.length === 0 && !nothingMatches && needle.length > 0 && (
        <ErrorNote>Nothing in the help centre matches “{query.trim()}”.</ErrorNote>
      )}
    </Scroller>
  );
}
