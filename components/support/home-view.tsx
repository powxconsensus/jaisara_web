"use client";

import { supportApi, type QuickOption, type TicketSummary } from "./support-api";
import { PerforatedEdge, Scroller, StatusPill, lastLine, statusTone } from "./widget-ui";

/**
 * The desk's front page.
 *
 * Three things, in the order somebody opening this actually wants them: the
 * conversation they are already in the middle of, a way to start a new one,
 * and the questions the platform can answer without one.
 *
 * The resume card only appears when there is something to resume — an empty
 * "you have no conversations" slot on the front page is a reminder of nothing.
 */
export function HomeView({
  name,
  latest,
  popular,
  onAsk,
  onOpenThread,
  onAnswer,
}: {
  name: string | null;
  latest: TicketSummary | null;
  popular: QuickOption[];
  onAsk: () => void;
  onOpenThread: (id: string) => void;
  onAnswer: (topic: string) => void;
}) {
  return (
    <Scroller className="px-[17px] pb-5 pt-[22px]">
      <p className="font-mono text-[9.5px] tracking-[0.22em] text-muted">JAISARA SUPPORT</p>

      {/* The one display-type moment in the panel. Two lines, second in the
          serif italic the site uses for its emphatic phrase. */}
      <p className="mt-[11px] font-display text-[25px] font-black leading-[1.1] tracking-[-0.025em]">
        {name ? `${name.split(" ")[0]}, something` : "Something not"}
      </p>
      <p className="mt-0.5 font-serif text-[29px] italic leading-[1.06] text-primary">
        {name ? "not adding up?" : "adding up?"}
      </p>

      <p className="mb-[19px] mt-[13px] text-[13.5px] leading-[1.65] text-muted">
        Ask the desk. The assistant answers instantly &mdash; a human takes over the moment it
        can&rsquo;t.
      </p>

      <button
        type="button"
        onClick={onAsk}
        className="flex w-full cursor-pointer items-center gap-[13px] rounded-[14px] bg-primary px-[17px] py-4 text-left text-on-primary transition duration-200 hover:-translate-y-0.5 hover:brightness-[1.06]"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[15px] font-bold">Ask the desk</span>
          {/* Not "opens a ticket": it opens a conversation, and a ticket is
              only raised if the assistant cannot settle it. Saying otherwise
              would promise a person who may never be needed. */}
          <span className="mt-1 block font-mono text-[9px] tracking-[0.12em] opacity-[0.72]">
            THE ASSISTANT ANSWERS FIRST
          </span>
        </span>
        <span
          className="grid size-[30px] flex-none place-items-center rounded-full text-sm"
          style={{ background: "color-mix(in oklab, var(--on-primary) 16%, transparent)" }}
        >
          →
        </span>
      </button>

      {latest && (
        <button
          type="button"
          onClick={() => onOpenThread(latest.id)}
          className="relative mt-[11px] w-full cursor-pointer overflow-hidden rounded-[14px] bg-surface-2 py-[15px] pl-[23px] pr-4 text-left transition hover:translate-x-[3px]"
        >
          <PerforatedEdge />
          <span className="mb-2 block font-mono text-[9px] tracking-[0.16em] text-muted">
            PICK UP WHERE YOU LEFT OFF
          </span>
          <span className="flex items-center gap-2.5">
            <span className="min-w-0 flex-1 truncate font-display text-[14.5px] font-semibold leading-[1.35]">
              {latest.subject}
            </span>
            <StatusPill status={latest.status} />
          </span>
          <span className="mt-[7px] block truncate text-[12.5px] leading-[1.5] text-muted">
            {lastLine(latest.lastMessage)}
          </span>
        </button>
      )}

      {popular.length > 0 && (
        <>
          <p className="mb-1 mt-[26px] font-mono text-[9.5px] tracking-[0.2em] text-muted">
            [ ASKED MOST TODAY ]
          </p>
          {popular.map((option) => (
            <button
              key={option.topic}
              type="button"
              onClick={() => onAnswer(option.topic)}
              className="flex min-h-[46px] w-full cursor-pointer items-center gap-3 border-b border-hair-soft py-3.5 text-left transition-[padding] duration-200 hover:pl-1.5"
            >
              <span className="flex-1 text-sm leading-[1.4]">{option.label}</span>
              <span className="flex-none text-sm text-muted">›</span>
            </button>
          ))}
        </>
      )}
    </Scroller>
  );
}

/** Loads what Home needs: the newest conversation and the guided questions. */
export async function loadHome(signedIn: boolean): Promise<{
  latest: TicketSummary | null;
  popular: QuickOption[];
}> {
  if (!signedIn) return { latest: null, popular: [] };

  const [tickets, options] = await Promise.all([
    supportApi.tickets().catch(() => [] as TicketSummary[]),
    supportApi.options().then((data) => data.options).catch(() => [] as QuickOption[]),
  ]);

  // The newest conversation that is still going — a closed one is history, and
  // inviting somebody back into it is not picking up where they left off.
  const latest = tickets.find((ticket) => ticket.status !== "CLOSED") ?? null;

  return { latest, popular: options.slice(0, 3) };
}

export { statusTone };
