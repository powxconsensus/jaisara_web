"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { useAssistant } from "./assistant-context";
import { supportApi, type QuickOption, type TicketSummary } from "./support-api";
import { HomeView, loadHome } from "./home-view";
import { AnswersView } from "./answers-view";
import { ThreadsView } from "./threads-view";
import { ThreadView } from "./thread-view";
import { ArticleView } from "./article-view";
import {
  DeskHeader,
  DetailHeader,
  Perforation,
  TabBar,
  statusLabel,
  ticketRef,
  type Tab,
} from "./widget-ui";
import type { HelpArticleSummary } from "./support-api";

/**
 * The support desk.
 *
 * A docket with three root tabs and two views that push over them. The panel's
 * whole identity is the receipt: a raised header, a punched perforation beneath
 * it, and conversation cards with torn left edges.
 *
 * The flow is deflection-first and stays that way. Home offers the questions
 * the platform can answer from the member's own rows; Answers expands them in
 * place; a conversation is reached *through* an attempt, and a ticket only
 * exists once the assistant has actually failed.
 */

interface View {
  tab: Tab;
  /** A conversation pushed over the tab - existing ticket, or fresh with a seed. */
  thread?: { ticketId?: string; seed?: string };
  /** A help article pushed over the tab. */
  doc?: string;
}

export function Assistant() {
  const { isOpen, open, close } = useAssistant();
  const { status, user } = useAuth();
  const signedIn = status === "authenticated";

  const [view, setView] = useState<View>({ tab: "home" });
  const [unread, setUnread] = useState(0);
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [latest, setLatest] = useState<TicketSummary | null>(null);
  const [popular, setPopular] = useState<QuickOption[]>([]);
  const [guides, setGuides] = useState<HelpArticleSummary[]>([]);
  /**
   * Which answer is expanded, held here rather than in the Answers view.
   *
   * Tapping a question on Home has to land on Answers with that one already
   * open - the design's whole point is that Home's popular list is a shortcut
   * into the index, not a separate screen.
   */
  const [openTopic, setOpenTopic] = useState<string | null>(null);

  const refreshUnread = useCallback(async () => {
    if (!signedIn) {
      setUnread(0);
      return;
    }
    try {
      setUnread((await supportApi.unread()).unread);
    } catch {
      // A badge is not worth surfacing an error for.
    }
  }, [signedIn]);

  const refreshHome = useCallback(async () => {
    const [home, list, help] = await Promise.all([
      loadHome(signedIn),
      signedIn ? supportApi.tickets().catch(() => [] as TicketSummary[]) : Promise.resolve([]),
      supportApi.helpArticles().catch(() => [] as HelpArticleSummary[]),
    ]);
    setLatest(home.latest);
    setPopular(home.popular);
    setTickets(list);
    setGuides(help);
  }, [signedIn]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the setStates are inside the callbacks, behind an await
    void refreshUnread();
  }, [refreshUnread]);

  // Home's cards are only worth fetching when the panel is actually open.
  useEffect(() => {
    if (!isOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the setStates are inside refreshHome, behind an await
    void refreshHome();
  }, [isOpen, refreshHome]);

  /**
   * Poll while closed.
   *
   * Sixty seconds, signed in only: this is a reply arriving within a working
   * day or two, not a live chat. Polling harder would cost every open tab a
   * request a second to learn nothing.
   */
  useEffect(() => {
    if (!signedIn || isOpen) return;
    const timer = window.setInterval(() => void refreshUnread(), 60_000);
    return () => window.clearInterval(timer);
  }, [signedIn, isOpen, refreshUnread]);

  /**
   * `?support=<id>` opens straight onto a thread - what the reply email links
   * to. Read from `location` rather than `useSearchParams` so this widget,
   * mounted on every page, does not drag every static route into dynamic
   * rendering.
   */
  useEffect(() => {
    const ticketId = new URLSearchParams(window.location.search).get("support");
    if (!ticketId || !signedIn) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to the URL, which is outside React
    setView({ tab: "threads", thread: { ticketId } });
    open();

    const url = new URL(window.location.href);
    url.searchParams.delete("support");
    window.history.replaceState(null, "", url.toString());
  }, [signedIn, open]);

  const back = () => setView({ tab: view.tab });
  const pushed = Boolean(view.thread || view.doc);

  /**
   * The status line.
   *
   * Says what is actually true for this member: whether somebody is already on
   * one of their conversations, or the desk is simply open. A fixed "replies in
   * ~6 min" would be a promise nothing here can keep.
   */
  const deskStatus = (() => {
    const waiting = tickets.filter((ticket) => ticket.status === "OPEN").length;
    if (waiting > 0) {
      return `${waiting} WITH US · REPLIES BY EMAIL`;
    }
    return "OPEN · ANSWERS FROM YOUR ACCOUNT";
  })();

  const detail = (() => {
    if (view.doc) {
      const guide = guides.find((row) => row.slug === view.doc);
      return { title: guide?.title ?? "Guide", meta: "GUIDE" };
    }
    if (view.thread?.ticketId) {
      const ticket = tickets.find((row) => row.id === view.thread?.ticketId);
      return {
        title: ticket?.subject ?? "Conversation",
        // Ref · status · age, the way the design prints it.
        meta: ticket
          ? `${ticketRef(ticket.id)} · ${statusLabel(ticket.status)} · ${ago(ticket.updatedAt)}`
          : undefined,
      };
    }
    if (view.thread) return { title: "Ask the desk", meta: "THE ASSISTANT ANSWERS FIRST" };
    return null;
  })();

  return (
    <>
      {isOpen && (
        <div
          role="dialog"
          aria-label="Jaisara support desk"
          /* dvh, not vh - mobile browser chrome otherwise clips the input. */
          className="fixed bottom-[calc(var(--chat-bottom)+66px)] right-4 z-[160] flex w-[var(--chat-w)] flex-col overflow-hidden rounded-[20px] border border-hair bg-surface shadow-card [animation:jsUp_.34s_cubic-bezier(.2,.8,.2,1)_both]"
          style={{ height: "var(--chat-h)", maxHeight: "calc(100dvh - 180px)" }}
        >
          <DeskHeader status={deskStatus} onClose={close} />
          <Perforation />

          {detail && <DetailHeader title={detail.title} meta={detail.meta} onBack={back} />}

          {view.doc ? (
            <ArticleView slug={view.doc} onAsk={() => setView({ tab: view.tab, thread: {} })} />
          ) : view.thread ? (
            <ThreadView
              userId={user?.id}
              ticketId={view.thread.ticketId}
              seed={view.thread.seed}
              onRead={() => {
                void refreshUnread();
                void refreshHome();
              }}
              onRaised={(ticketId) => {
                void refreshUnread();
                void refreshHome();
                setView({ tab: "threads", thread: { ticketId } });
              }}
            />
          ) : view.tab === "answers" ? (
            <AnswersView
              signedIn={signedIn}
              openTopic={openTopic}
              setOpenTopic={setOpenTopic}
              onAskHuman={(question) =>
                setView({ tab: "answers", thread: { seed: question } })
              }
              onOpenGuide={(slug) => setView({ tab: "answers", doc: slug })}
            />
          ) : view.tab === "threads" ? (
            <ThreadsView
              signedIn={signedIn}
              onOpen={(id) => setView({ tab: "threads", thread: { ticketId: id } })}
              onNew={() => setView({ tab: "threads", thread: {} })}
            />
          ) : (
            <HomeView
              name={signedIn ? (user?.displayName ?? null) : null}
              latest={latest}
              popular={popular}
              onAsk={() => setView({ tab: "home", thread: {} })}
              onOpenThread={(id) => setView({ tab: "home", thread: { ticketId: id } })}
              onAnswer={(topic) => {
                setOpenTopic(topic);
                setView({ tab: "answers" });
              }}
            />
          )}

          {!pushed && (
            <TabBar
              value={view.tab}
              onChange={(tab) => setView({ tab })}
              ticketCount={tickets.length}
            />
          )}
        </div>
      )}

      <Launcher unread={unread} />
    </>
  );
}

/**
 * The launcher.
 *
 * A receipt with a torn bottom edge, drawn in CSS - the site's own object
 * rather than the speech bubble every support widget uses.
 */
function Launcher({ unread }: { unread: number }) {
  const { isOpen, toggle } = useAssistant();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isOpen ? "Close support desk" : "Open support desk"}
      aria-expanded={isOpen}
      className="fixed bottom-[var(--chat-bottom)] right-4 z-[150] grid size-[52px] cursor-pointer place-items-center rounded-2xl bg-primary text-on-primary transition-transform duration-[340ms] ease-[cubic-bezier(.2,.8,.2,1)] hover:brightness-[1.07]"
      style={{ boxShadow: "0 20px 36px -18px rgba(0,0,0,.5)" }}
    >
      {isOpen ? (
        <span className="text-lg leading-none">×</span>
      ) : (
        <span
          aria-hidden
          className="flex h-[22px] w-[19px] flex-col justify-center gap-[3px] bg-on-primary px-1"
          style={{
            clipPath:
              "polygon(0 0,100% 0,100% 100%,83% 88%,66% 100%,50% 88%,33% 100%,17% 88%,0 100%)",
          }}
        >
          <span className="h-0.5 rounded-[1px] bg-primary" />
          <span className="h-0.5 w-[68%] rounded-[1px] bg-primary" />
          <span className="h-0.5 rounded-[1px] bg-primary" />
        </span>
      )}

      {!isOpen && unread > 0 && (
        <span
          aria-label={`${unread} unread`}
          className="absolute -right-[5px] -top-[5px] grid min-w-5 place-items-center rounded-[10px] border-2 border-bg bg-club px-[5px] font-mono text-[9.5px] font-bold leading-4 text-bg"
        >
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );
}

/** Shown when a signed-out visitor reaches a view that needs an account. */
export function SignedOutNote({ what }: { what: string }) {
  return (
    <div className="p-[17px]">
      <p className="text-[13.5px] leading-[1.6] text-muted">Sign in and I can {what}.</p>
      <Link
        href="/login"
        className="mt-3 inline-block border-b pb-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-primary"
        style={{ borderColor: "color-mix(in oklab, var(--primary) 45%, transparent)" }}
      >
        Sign in →
      </Link>
    </div>
  );
}

function ago(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 60) return `${Math.max(minutes, 1)}M`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}H`;
  return `${Math.floor(hours / 24)}D`;
}
