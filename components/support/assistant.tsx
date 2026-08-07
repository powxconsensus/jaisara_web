"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { CloseIcon } from "@/components/ui/icons";
import { useToast } from "@/components/shell/toast";
import { useAuth } from "@/components/auth/auth-context";
import { apiErrorMessage } from "@/lib/auth-types";
import { useAssistant } from "./assistant-context";

/**
 * The support assistant (handoff §4.12).
 *
 * The shape of the conversation is deliberate:
 *
 *  1. **Guided options first.** Most questions have an answer already sitting
 *     in the member's own rows — which claim, what status, what date it clears.
 *     Those are answered from the database, not by a model, because a bot that
 *     guesses at somebody's balance creates a complaint rather than closing one.
 *  2. **Then free chat**, with that same data as context and a standing
 *     instruction never to state a figure it was not given.
 *  3. **Then a ticket, only if the member says so.** The assistant proposes
 *     escalation; the member confirms it. A bot that opens tickets on its own
 *     judgement fills the queue with things nobody asked to escalate.
 *
 * Signed out, none of this applies — there is no account to answer about, so
 * it points at sign-in instead of pretending to help.
 */

interface Message {
  from: "bot" | "me" | "agent";
  text: string;
  action?: { label: string; href: string } | null;
}

interface QuickOption {
  topic: string;
  label: string;
}

const GREETING =
  "Hi — I can look up your claims, cashback and payouts. Pick one of these, or just tell me what is going on.";

export function Assistant() {
  const { isOpen, toggle, close } = useAssistant();
  const { status } = useAuth();
  const { toast } = useToast();

  const [messages, setMessages] = useState<Message[]>([{ from: "bot", text: GREETING }]);
  const [options, setOptions] = useState<QuickOption[]>([]);
  const [freeChat, setFreeChat] = useState(true);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [canEscalate, setCanEscalate] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const signedIn = status === "authenticated";

  // Keep the newest message in view as the thread grows.
  useEffect(() => {
    const body = bodyRef.current;
    if (body) body.scrollTop = body.scrollHeight;
  }, [messages, typing]);

  useEffect(() => {
    if (!isOpen || !signedIn) return;
    const controller = new AbortController();

    void fetch("/api/support/options", { cache: "no-store", signal: controller.signal })
      .then(async (response) => (response.ok ? await response.json() : null))
      .then((data: { options: QuickOption[]; freeChat: boolean } | null) => {
        if (controller.signal.aborted || !data) return;
        setOptions(data.options);
        setFreeChat(data.freeChat);
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [isOpen, signedIn]);

  /** The transcript the API needs, without the opening greeting. */
  const historyFor = (list: Message[]) =>
    list
      .filter((message) => message.text !== GREETING && message.from !== "agent")
      .map((message) => ({
        role: message.from === "me" ? ("member" as const) : ("assistant" as const),
        body: message.text,
      }));

  const ask = async (payload: { topic?: string; message?: string }, echo?: string) => {
    const next: Message[] = echo ? [...messages, { from: "me", text: echo }] : messages;
    if (echo) setMessages(next);
    setDraft("");
    setTyping(true);

    try {
      const response = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...payload, history: historyFor(next).slice(-18) }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setMessages((prev) => [
          ...prev,
          { from: "bot", text: apiErrorMessage(data, "I could not reach the account service.") },
        ]);
        setCanEscalate(true);
        return;
      }

      setMessages((prev) => [
        ...prev,
        { from: "bot", text: data.body, action: data.action ?? null },
      ]);
      if (data.suggestEscalation) setCanEscalate(true);
    } catch {
      setMessages((prev) => [
        ...prev,
        { from: "bot", text: "I could not reach the account service just now." },
      ]);
      setCanEscalate(true);
    } finally {
      setTyping(false);
    }
  };

  /**
   * Raises the ticket. Only ever from an explicit click — the assistant can
   * suggest this, but the member is the one who decides a person gets involved.
   */
  const escalate = async () => {
    const history = historyFor(messages);
    if (history.length === 0) {
      setMessages((prev) => [
        ...prev,
        { from: "bot", text: "Tell me what is going on first, then I can pass it on with context." },
      ]);
      return;
    }

    setTyping(true);
    try {
      const response = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ history }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setMessages((prev) => [
          ...prev,
          { from: "bot", text: apiErrorMessage(data, "I could not raise that ticket.") },
        ]);
        return;
      }

      setTicketId(data.id);
      setCanEscalate(false);
      setMessages((prev) => [
        ...prev,
        {
          from: "agent",
          text: `Raised as "${data.subject}". Somebody will reply within one to two working days, and you will get an email when they do.`,
        },
      ]);
      toast("Ticket raised.", "success");
    } catch {
      setMessages((prev) => [
        ...prev,
        { from: "bot", text: "I could not raise that ticket just now." },
      ]);
    } finally {
      setTyping(false);
    }
  };

  const isFresh = messages.length === 1;

  return (
    <>
      {isOpen && (
        <div
          role="dialog"
          aria-label="Support chat"
          /* dvh, not vh — mobile browser chrome otherwise clips the input. */
          className="fixed bottom-[calc(var(--chat-bottom)+60px)] right-4 z-[160] flex w-[var(--chat-w)] flex-col overflow-hidden rounded-[18px] border border-hair bg-surface shadow-card [animation:jsUp_.32s_cubic-bezier(.2,.8,.2,1)_both]"
          style={{ height: "var(--chat-h)", maxHeight: "calc(100dvh - 190px)" }}
        >
          <header className="flex flex-none items-center gap-3 border-b border-hair-soft px-[18px] py-4">
            <span
              className={cn(
                "grid size-[34px] flex-none place-items-center rounded-[10px] font-display text-[13px] font-black",
                ticketId ? "bg-club text-bg" : "bg-primary text-on-primary",
              )}
            >
              J
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold">
                {ticketId ? "Ticket raised" : "Jaisara Assistant"}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5">
                <span className="size-[5px] rounded-[2px] bg-success" />
                <span className="font-mono text-[9px] tracking-[0.06em] text-muted">
                  {ticketId
                    ? "A person will reply by email"
                    : "Answers from your own account"}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close support chat"
              className="cursor-pointer p-1 text-muted hover:text-fg"
            >
              <CloseIcon size={18} />
            </button>
          </header>

          <div ref={bodyRef} className="flex flex-1 flex-col gap-[11px] overflow-y-auto p-[18px]">
            {!signedIn ? (
              <div className="self-start rounded-xl rounded-bl-[4px] border border-hair-soft bg-surface-2 px-3.5 py-[11px] text-[13px] leading-[1.55]">
                Sign in and I can look up your claims, cashback and payouts directly.
                <Link
                  href="/login"
                  className="mt-2.5 block font-mono text-[10px] tracking-[0.12em] text-primary"
                >
                  SIGN IN →
                </Link>
              </div>
            ) : (
              <>
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={cn(
                      "max-w-[84%] whitespace-pre-line rounded-xl border px-3.5 py-[11px] text-[13px] leading-[1.55] [animation:jsUp_.3s_both]",
                      message.from === "me"
                        ? "self-end rounded-br-[4px] border-transparent bg-primary text-on-primary"
                        : message.from === "agent"
                          ? "self-start rounded-bl-[4px] border-club/40 bg-club/10"
                          : "self-start rounded-bl-[4px] border-hair-soft bg-surface-2",
                    )}
                  >
                    {message.text}
                    {message.action && (
                      <Link
                        href={message.action.href}
                        onClick={close}
                        className="mt-2.5 block font-mono text-[10px] tracking-[0.12em] text-primary"
                      >
                        {message.action.label.toUpperCase()} →
                      </Link>
                    )}
                  </div>
                ))}

                {typing && (
                  <div className="flex gap-1 self-start rounded-xl rounded-bl-[4px] bg-surface-2 px-[15px] py-[13px]">
                    {[0, 0.15, 0.3].map((delay) => (
                      <span
                        key={delay}
                        className="size-[5px] rounded-[2px] bg-muted"
                        style={{ animation: `jsBlink 1.2s ${delay}s ease-in-out infinite` }}
                      />
                    ))}
                  </div>
                )}

                {/* Guided options under the greeting, not pinned. */}
                {isFresh && options.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {options.map((option) => (
                      <button
                        key={option.topic}
                        type="button"
                        onClick={() => void ask({ topic: option.topic }, option.label)}
                        className="min-h-9 cursor-pointer rounded-lg border border-hair px-3 py-2 text-[11.5px] text-muted transition hover:border-primary hover:text-fg"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {signedIn && !ticketId && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const message = draft.trim();
                if (message) void ask({ message }, message);
              }}
              className="flex flex-none items-center gap-2 border-t border-hair-soft px-[13px] py-[11px]"
            >
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={
                  freeChat ? "Ask about a claim, payout, coupon…" : "Pick a question above"
                }
                aria-label="Message"
                className="flex-1 rounded-[10px] border border-hair bg-surface-2 px-[13px] py-[11px] text-[13px] outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={typing}
                aria-label="Send message"
                className="grid size-[38px] flex-none cursor-pointer place-items-center rounded-[10px] bg-primary text-sm text-on-primary transition hover:brightness-[1.08] disabled:opacity-50"
              >
                ↑
              </button>
            </form>
          )}

          {signedIn && (
            <div className="flex-none border-t border-hair-soft">
              {ticketId ? (
                <Link
                  href={`/dashboard/support/${ticketId}`}
                  onClick={close}
                  className="block px-4 py-2.5 text-center font-mono text-[9px] uppercase tracking-[0.1em] text-primary"
                >
                  Open the ticket →
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => void escalate()}
                  disabled={typing}
                  className={cn(
                    "w-full cursor-pointer px-4 py-2.5 text-center font-mono text-[9px] uppercase tracking-[0.1em] transition-colors disabled:opacity-50",
                    canEscalate ? "text-primary" : "text-muted hover:text-fg",
                  )}
                >
                  {canEscalate
                    ? "Raise this with the team →"
                    : "Not solved? Raise a ticket →"}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={toggle}
        aria-label={isOpen ? "Close support chat" : "Open support chat"}
        aria-expanded={isOpen}
        className="fixed bottom-[var(--chat-bottom)] right-4 z-[150] grid size-[46px] cursor-pointer place-items-center rounded-[13px] bg-primary text-on-primary transition-transform duration-[250ms] ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-[3px]"
        style={{ boxShadow: "0 18px 34px -20px rgba(0,0,0,.45)" }}
      >
        <span className="flex gap-[3px]">
          <span className="size-[5px] rounded-[2px] bg-on-primary" />
          <span className="size-[5px] rounded-[2px] bg-on-primary opacity-[0.72]" />
          <span className="size-[5px] rounded-[2px] bg-on-primary opacity-[0.45]" />
        </span>
      </button>
    </>
  );
}
