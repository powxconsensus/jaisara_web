"use client";

import { useEffect, useRef, useState } from "react";
import {
  GREETING,
  HUMAN_ACK,
  HUMAN_GREETING,
  QUICK_ASKS,
  botReply,
} from "@/lib/data/assistant";
import { cn } from "@/lib/cn";
import { CloseIcon } from "@/components/ui/icons";
import { useToast } from "@/components/shell/toast";
import { useAssistant } from "./assistant-context";

interface Message {
  from: "bot" | "me" | "human";
  text: string;
}

/**
 * Floating support assistant (handoff §4.12).
 *
 * Suggestion chips sit directly under the greeting rather than pinned to the
 * bottom, the thread grows downward, the input is pinned, and escalation to a
 * human is an explicit action.
 *
 * Sizing uses `dvh`, never `vh` — mobile browser chrome otherwise clips the
 * input out of reach.
 */
export function Assistant() {
  const { isOpen, toggle, close } = useAssistant();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([{ from: "bot", text: GREETING }]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [escalated, setEscalated] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const replyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the newest message in view as the thread grows.
  useEffect(() => {
    const body = bodyRef.current;
    if (body) body.scrollTop = body.scrollHeight;
  }, [messages, typing]);

  useEffect(() => () => {
    if (replyTimer.current) clearTimeout(replyTimer.current);
  }, []);

  const send = (text: string) => {
    const question = text.trim();
    if (!question) return;

    setMessages((prev) => [...prev, { from: "me", text: question }]);
    setDraft("");
    setTyping(true);

    if (replyTimer.current) clearTimeout(replyTimer.current);
    replyTimer.current = setTimeout(() => {
      setTyping(false);
      setMessages((prev) => [
        ...prev,
        escalated
          ? { from: "human", text: HUMAN_ACK }
          : { from: "bot", text: botReply(question) },
      ]);
    }, 1000);
  };

  const escalate = () => {
    if (escalated) return;
    setEscalated(true);
    setTyping(true);
    toast("Connecting you to the support desk", "info");
    if (replyTimer.current) clearTimeout(replyTimer.current);
    replyTimer.current = setTimeout(() => {
      setTyping(false);
      setMessages((prev) => [...prev, { from: "human", text: HUMAN_GREETING }]);
    }, 1200);
  };

  const isFresh = messages.length === 1;

  return (
    <>
      {isOpen && (
        <div
          role="dialog"
          aria-label="Support chat"
          /* dvh, not vh — see the note above. Sits above the mobile tab bar. */
          className="fixed bottom-[calc(var(--chat-bottom)+60px)] right-4 z-[160] flex w-[var(--chat-w)] flex-col overflow-hidden rounded-[18px] border border-hair bg-surface shadow-card [animation:jsUp_.32s_cubic-bezier(.2,.8,.2,1)_both]"
          style={{ height: "var(--chat-h)", maxHeight: "calc(100dvh - 190px)" }}
        >
          <header className="flex flex-none items-center gap-3 border-b border-hair-soft px-[18px] py-4">
            <span
              className={cn(
                "grid size-[34px] flex-none place-items-center rounded-[10px] font-display text-[13px] font-black",
                escalated ? "bg-club text-bg" : "bg-primary text-on-primary",
              )}
            >
              {escalated ? "M" : "J"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold">
                {escalated ? "Meera · Support" : "Jaisara Assistant"}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5">
                <span className="size-[5px] rounded-[2px] bg-success" />
                <span className="font-mono text-[9px] tracking-[0.06em] text-muted">
                  {escalated ? "Human agent · replies in ~2 min" : "Bot · instant answers"}
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
            {messages.map((message, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[84%] rounded-xl border px-3.5 py-[11px] text-[13px] leading-[1.55] [animation:jsUp_.3s_both]",
                  message.from === "me"
                    ? "self-end rounded-br-[4px] border-transparent bg-primary text-on-primary"
                    : "self-start rounded-bl-[4px] border-hair-soft bg-surface-2",
                )}
              >
                {message.text}
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

            {/* Suggestion chips directly under the greeting, not pinned. */}
            {isFresh && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {QUICK_ASKS.map((ask) => (
                  <button
                    key={ask}
                    type="button"
                    onClick={() => send(ask)}
                    className="min-h-9 cursor-pointer rounded-lg border border-hair px-3 py-2 text-[11.5px] text-muted transition hover:border-primary hover:text-fg"
                  >
                    {ask}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              send(draft);
            }}
            className="flex flex-none items-center gap-2 border-t border-hair-soft px-[13px] py-[11px]"
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask about a claim, payout, coupon…"
              aria-label="Message"
              className="flex-1 rounded-[10px] border border-hair bg-surface-2 px-[13px] py-[11px] text-[13px] outline-none focus:border-primary"
            />
            <button
              type="submit"
              aria-label="Send message"
              className="grid size-[38px] flex-none cursor-pointer place-items-center rounded-[10px] bg-primary text-sm text-on-primary transition hover:brightness-[1.08]"
            >
              ↑
            </button>
          </form>

          <button
            type="button"
            onClick={escalate}
            disabled={escalated}
            className="flex-none cursor-pointer border-t border-hair-soft px-4 py-2.5 text-center font-mono text-[9px] uppercase tracking-[0.1em] text-muted transition-colors hover:text-fg disabled:cursor-default"
          >
            {escalated ? "A human is on this conversation" : "Not solved? Talk to a human →"}
          </button>
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
