"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/shell/toast";
import {
  ATTACHMENT_MAX_BYTES,
  clearDraft,
  loadDraft,
  saveDraft,
  supportApi,
  SupportError,
  type ChatTurn,
  type Choice,
  type QuickOption,
  type StagedAttachment,
  type Stage,
} from "./support-api";
import { ErrorNote, Scroller, Skeleton, ago } from "./widget-ui";

/**
 * One conversation.
 *
 * Deliberately one component for both halves of a support thread. Before a
 * ticket exists this is the assistant answering from the member's own rows;
 * after escalation it is the same thread with a person in it. Splitting them
 * would mean two message lists, two input boxes and two sets of scroll
 * behaviour that drift apart - and to the member it was always one conversation
 * anyway.
 *
 * **The assistant leads.** It opens with a greeting and a question rather than
 * presenting an empty box, and it is the one that offers a human - as a pair of
 * buttons, at the point it has actually run out of road. A member never has to
 * find the escalation control, and the assistant never files a ticket on its
 * own judgement: the offer is made here, the decision is theirs.
 *
 * The stage lives in this component and is echoed to the API on each turn,
 * which keeps the endpoint stateless and means a reload resumes exactly where
 * the conversation was.
 */

interface Message {
  from: "bot" | "me" | "agent";
  text: string;
  action?: { label: string; href: string } | null;
  /** Set on answers drawn straight from the member's rows. */
  fromAccount?: boolean;
  /** Buttons the assistant offered with this message. */
  choices?: Choice[] | null;
  at?: string;
  /** The agent's display name, when a person wrote it. */
  who?: string | null;
}

interface Draft {
  messages: Message[];
  stage: Stage;
  attachments: StagedAttachment[];
}

export function ThreadView({
  userId,
  ticketId,
  seed,
  onRaised,
  onRead,
}: {
  userId: string | undefined;
  /** Set when reading an existing ticket; absent for a fresh conversation. */
  ticketId?: string;
  /** A question carried in from Answers or Home. */
  seed?: string;
  onRaised: (ticketId: string) => void;
  onRead: () => void;
}) {
  const { toast } = useToast();
  const live = !ticketId;

  const [restored] = useState(() => (live ? loadDraft<Draft>(userId) : null));
  const [messages, setMessages] = useState<Message[]>(restored?.messages ?? []);
  const [stage, setStage] = useState<Stage>(restored?.stage ?? "asking");
  const [attachments, setAttachments] = useState<StagedAttachment[]>(restored?.attachments ?? []);
  const [closed, setClosed] = useState(false);
  const [loading, setLoading] = useState(Boolean(ticketId));
  const [quickAsks, setQuickAsks] = useState<QuickOption[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const seeded = useRef(false);
  const greeted = useRef(messages.length > 0);

  useEffect(() => {
    if (live) saveDraft(userId, { messages, stage, attachments } satisfies Draft);
  }, [live, userId, messages, stage, attachments]);

  useEffect(() => {
    const body = bodyRef.current;
    if (body) body.scrollTop = body.scrollHeight;
  }, [messages, busy]);

  // An existing ticket: load the thread and clear its unread badge.
  const loadTicket = useCallback(async () => {
    if (!ticketId) return;
    try {
      const ticket = await supportApi.ticket(ticketId);
      setClosed(ticket.status === "CLOSED");
      setMessages(
        ticket.messages.map((message) => ({
          from: message.role === "MEMBER" ? ("me" as const) : ("agent" as const),
          text: message.body,
          at: message.createdAt,
          who: message.author?.displayName ?? null,
        })),
      );
      setError(null);
    } catch (caught) {
      setError(
        caught instanceof SupportError ? caught.message : "That conversation could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    if (!ticketId) return;
    void loadTicket().then(async () => {
      await supportApi.markRead(ticketId);
      onRead();
    });
    // `onRead` is a fresh closure each render; depending on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadTicket, ticketId]);

  /**
   * The assistant speaks first.
   *
   * A support widget that opens on an empty text box asks the member to do the
   * hard part - work out what is worth saying. Greeting them and naming what it
   * can look up gets a usable first message instead of "hi".
   */
  useEffect(() => {
    if (!live || !userId || greeted.current) return;
    greeted.current = true;

    void supportApi
      .options()
      .then((data) => {
        setQuickAsks(data.options.slice(0, 4));
        if (!seed) setMessages([{ from: "bot", text: data.greeting }]);
      })
      .catch(() => undefined);
  }, [live, userId, seed]);

  const historyFor = (list: Message[]): ChatTurn[] =>
    list
      .filter((message) => message.from !== "agent")
      .map((message) => ({
        role: message.from === "me" ? ("member" as const) : ("assistant" as const),
        body: message.text,
      }));

  const say = async (
    payload: { topic?: string; message?: string; intent?: Choice["intent"] },
    echo: string | null,
  ) => {
    const next: Message[] = echo ? [...messages, { from: "me" as const, text: echo }] : messages;
    setMessages(next);
    setDraft("");
    setBusy(true);
    setError(null);

    // A choice was taken, so its buttons must stop being pressable - otherwise
    // the member can answer the same question twice and confuse the stage.
    setMessages((prev) => prev.map((message) => ({ ...message, choices: null })));

    try {
      const reply = await supportApi.chat({
        ...payload,
        stage,
        history: historyFor(next).slice(-18),
      });

      setMessages((prev) => [
        ...prev,
        {
          from: "bot",
          text: reply.body,
          action: reply.action,
          fromAccount: reply.source === "data",
          choices: reply.choices,
        },
      ]);
      setStage(reply.stage);
    } catch (caught) {
      setMessages((prev) => [
        ...prev,
        {
          from: "bot",
          text:
            caught instanceof SupportError
              ? caught.message
              : "I could not reach the account service just now.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  // Whatever brought them here is asked immediately - arriving at an empty box
  // after clicking a specific question is a step backwards.
  useEffect(() => {
    if (!live || !seed || seeded.current || !userId) return;
    seeded.current = true;
    void say({ message: seed }, seed);
    // Deliberately once, on the seed we arrived with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, seed, userId]);

  /**
   * Raises the ticket, once the member has said they are done adding to it.
   *
   * Driven by the stage rather than a button the member hunts for: the
   * assistant asked, they answered, and this is the consequence.
   */
  const raise = useCallback(async () => {
    setBusy(true);
    try {
      const ticket = await supportApi.escalate(
        historyFor(messages),
        attachments.map((file) => file.id),
      );
      // The conversation now lives on the ticket; keeping a copy here would
      // start the next question inside the last problem.
      clearDraft(userId);
      toast("Raised with the team.", "success");
      onRaised(ticket.id);
    } catch (caught) {
      setStage("asking");
      setMessages((prev) => [
        ...prev,
        {
          from: "bot",
          text: caught instanceof SupportError ? caught.message : "I could not raise that.",
        },
      ]);
    } finally {
      setBusy(false);
    }
    // `messages` and `attachments` are read fresh on each call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, attachments, userId]);

  useEffect(() => {
    if (stage !== "ready" || busy) return;
    void raise();
    // Firing once, when the conversation reaches the handover.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  /**
   * Staging a file.
   *
   * Uploaded now, bound to the ticket when it is opened. The size is checked
   * here as well as in the API - not as a security measure, which it could
   * never be, but so an eight-megabyte screenshot fails instantly instead of
   * after a slow upload.
   */
  const attach = async (file: File) => {
    if (file.size > ATTACHMENT_MAX_BYTES) {
      setError(`${file.name} is too large - attachments must be under 8MB.`);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const staged = await supportApi.attach(file);
      setAttachments((prev) => [...prev, staged]);
    } catch (caught) {
      setError(
        caught instanceof SupportError ? caught.message : "That file could not be attached.",
      );
    } finally {
      setBusy(false);
    }
  };

  /** A member's reply on an existing ticket. */
  const reply = async () => {
    const body = draft.trim();
    if (!body || !ticketId) return;

    setBusy(true);
    setError(null);
    try {
      await supportApi.reply(ticketId, body);
      setDraft("");
      await loadTicket();
    } catch (caught) {
      setError(caught instanceof SupportError ? caught.message : "That reply could not be sent.");
    } finally {
      setBusy(false);
    }
  };

  const collecting = live && stage === "collecting";

  return (
    <>
      <Scroller className="flex flex-col gap-3.5 px-4 pb-3.5 pt-4" ref={bodyRef}>
        {error && <ErrorNote>{error}</ErrorNote>}

        {loading ? (
          <Skeleton rows={2} />
        ) : (
          <>
            {messages.map((message, index) => {
              const mine = message.from === "me";
              const agent = message.from === "agent";
              // Only when the speaker changes - labelling every consecutive
              // message from the same person is noise, not information.
              const showWho = !mine && messages[index - 1]?.from !== message.from;

              return (
                <div
                  key={index}
                  className={cn(
                    "max-w-[87%] flex-none [animation:jsUp_.32s_cubic-bezier(.2,.8,.2,1)_both]",
                    mine ? "self-end" : "self-start",
                  )}
                >
                  {showWho && (
                    <p className="mb-1.5 pl-[3px] font-mono text-[9px] tracking-[0.15em] text-muted">
                      {agent
                        ? `${(message.who ?? "Jaisara").toUpperCase()} · SUPPORT DESK`
                        : message.fromAccount
                          ? "FROM YOUR ACCOUNT"
                          : "JAISARA ASSISTANT"}
                    </p>
                  )}
                  {/* A person's reply is club-tinted so it is unmistakably not
                      the assistant - the whole promise of escalating is that
                      somebody read it, and the bubble should show that. */}
                  <div
                    className={cn(
                      "whitespace-pre-line border px-[15px] py-3 text-[13.5px] leading-[1.6]",
                      mine
                        ? "rounded-[16px] rounded-br-[5px] border-transparent bg-primary text-on-primary"
                        : "rounded-[16px] rounded-bl-[5px]",
                      !mine && !agent && "border-transparent bg-surface-2",
                    )}
                    style={
                      agent
                        ? {
                            background: "color-mix(in oklab, var(--club) 13%, var(--surface-2))",
                            borderColor: "color-mix(in oklab, var(--club) 30%, var(--border))",
                          }
                        : undefined
                    }
                  >
                    {message.text}
                    {message.action && (
                      <Link
                        href={message.action.href}
                        className="mt-2.5 block border-b pb-0.5 font-mono text-[9px] uppercase tracking-[0.13em] text-primary"
                        style={{
                          borderColor: "color-mix(in oklab, var(--primary) 45%, transparent)",
                        }}
                      >
                        {message.action.label} →
                      </Link>
                    )}
                  </div>

                  {/* The assistant's own offer, as buttons. Answering by
                      pressing one costs no model call and cannot be
                      misunderstood the way typing "yes" can. */}
                  {message.choices && message.choices.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-[7px]">
                      {message.choices.map((choice) => (
                        <button
                          key={choice.intent}
                          type="button"
                          disabled={busy}
                          onClick={() => void say({ intent: choice.intent }, choice.label)}
                          className={cn(
                            "min-h-9 cursor-pointer rounded-[10px] px-3.5 py-2 text-[12.5px] transition disabled:opacity-50",
                            choice.intent === "escalate_no"
                              ? "border border-hair text-muted hover:border-primary hover:text-fg"
                              : "bg-primary font-semibold text-on-primary hover:brightness-[1.07]",
                          )}
                        >
                          {choice.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {message.at && (
                    <p
                      className={cn(
                        "mt-1.5 font-mono text-[9px] tracking-[0.1em] text-muted",
                        mine ? "text-right" : "",
                      )}
                    >
                      {ago(message.at)}
                    </p>
                  )}
                </div>
              );
            })}

            {busy && (
              <div className="flex flex-none gap-1 self-start rounded-[16px] rounded-bl-[5px] bg-surface-2 px-4 py-3.5">
                {[0, 0.15, 0.3].map((delay) => (
                  <span
                    key={delay}
                    className="size-[5px] rounded-[2px] bg-muted"
                    style={{ animation: `jsBlink 1.2s ${delay}s ease-in-out infinite` }}
                  />
                ))}
              </div>
            )}

            {/* What is going up with the ticket, listed where it was added. */}
            {attachments.length > 0 && (
              <div className="flex flex-none flex-col gap-1.5 self-end">
                {attachments.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-2 rounded-[10px] border border-hair bg-surface-2 px-3 py-2"
                  >
                    <span aria-hidden className="font-mono text-[9px] tracking-[0.1em] text-primary">
                      {file.contentType === "application/pdf" ? "PDF" : "IMG"}
                    </span>
                    <span className="max-w-[190px] truncate text-[12px]">{file.fileName}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setAttachments((prev) => prev.filter((item) => item.id !== file.id))
                      }
                      className="cursor-pointer font-mono text-[9px] tracking-[0.1em] text-muted hover:text-danger"
                    >
                      REMOVE
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Only before the first message - once the assistant has greeted
                and been answered, these would be a second conversation. */}
            {live && messages.length <= 1 && quickAsks.length > 0 && (
              <div className="flex flex-none flex-wrap gap-[7px]">
                {quickAsks.map((option) => (
                  <button
                    key={option.topic}
                    type="button"
                    onClick={() => void say({ topic: option.topic }, option.label)}
                    className="flex min-h-10 cursor-pointer items-center rounded-[10px] border border-hair px-3.5 py-2.5 text-[12.5px] text-muted transition hover:border-primary hover:text-fg"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </Scroller>

      {closed ? (
        <p className="flex-none border-t border-hair-soft px-4 py-3 text-[11.5px] leading-5 text-muted">
          This conversation is closed. If it comes up again, start a new one from Home.
        </p>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const text = draft.trim();
            if (!text) return;
            if (live) void say({ message: text }, text);
            else void reply();
          }}
          className="flex flex-none items-center gap-[9px] border-t border-hair-soft px-[13px] py-3"
        >
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={
              collecting ? "Add anything else…" : live ? "Tell me what happened…" : "Type a reply…"
            }
            aria-label="Message"
            className="min-w-0 flex-1 rounded-[11px] border border-hair bg-surface-2 px-3.5 py-3 text-[13.5px] outline-none transition-colors focus:border-primary"
          />
          {/* Offered while gathering detail for a ticket. Outside that window a
              file has nowhere to go, and a button that silently does nothing is
              worse than one that is not there. */}
          {collecting && (
            <label
              className="grid size-[42px] flex-none cursor-pointer place-items-center rounded-[11px] border border-hair text-lg leading-none text-muted transition hover:border-primary hover:text-primary"
              title="Attach an image or PDF"
            >
              <span aria-hidden>+</span>
              <span className="sr-only">Attach an image or PDF</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void attach(file);
                }}
              />
            </label>
          )}
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            aria-label="Send"
            className="grid size-[42px] flex-none cursor-pointer place-items-center rounded-[11px] bg-primary text-[15px] text-on-primary transition hover:brightness-[1.07] disabled:opacity-40"
          >
            ↑
          </button>
        </form>
      )}
    </>
  );
}
