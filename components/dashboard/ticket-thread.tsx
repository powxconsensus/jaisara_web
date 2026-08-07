"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { apiErrorMessage } from "@/lib/auth-types";
import { useToast } from "@/components/shell/toast";

/**
 * One support ticket, from the member's side.
 *
 * The assistant transcript that led here is not replayed: it is on the ticket
 * for the agent, but re-reading your own failed conversation with a bot is not
 * what you came back for. The thread starts from what you said and what a
 * person answered.
 */

interface TicketMessage {
  id: string;
  role: "MEMBER" | "AGENT" | "BOT";
  body: string;
  createdAt: string;
}

interface Ticket {
  id: string;
  subject: string;
  status: "OPEN" | "WAITING_ON_MEMBER" | "RESOLVED" | "CLOSED";
  category: string;
  createdAt: string;
  messages: TicketMessage[];
}

const STATUS_LABEL: Record<Ticket["status"], string> = {
  OPEN: "With us",
  WAITING_ON_MEMBER: "Replied — over to you",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

const STATUS_TONE: Record<Ticket["status"], string> = {
  OPEN: "var(--warning)",
  WAITING_ON_MEMBER: "var(--info)",
  RESOLVED: "var(--success)",
  CLOSED: "var(--text-muted)",
};

export function TicketThread({ ticketId }: { ticketId: string }) {
  const { toast } = useToast();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/support/tickets/${ticketId}`, { cache: "no-store" });
    if (response.status === 404) {
      setNotFound(true);
      return;
    }
    if (response.ok) setTicket((await response.json()) as Ticket);
  }, [ticketId]);

  useEffect(() => {
    // The setState calls inside `load` are all behind an await; the rule
    // follows the call and cannot see that.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().catch(() => setError("That ticket could not be loaded."));
  }, [load]);

  const reply = async (event: React.FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;

    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/support/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(apiErrorMessage(result, "That reply could not be sent."));
        return;
      }
      setDraft("");
      toast("Reply sent.", "success");
      await load();
    } catch {
      setError("The support service is unavailable. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (notFound) {
    return (
      <div className="rounded-card border border-hair bg-surface p-8 text-center">
        <p className="mb-2 text-sm font-semibold">No such ticket</p>
        <p className="text-[12.5px] text-muted">
          It may belong to another account, or it was never created.
        </p>
      </div>
    );
  }

  if (!ticket) {
    return <div aria-busy className="h-[320px] animate-pulse rounded-card bg-surface-2" />;
  }

  return (
    <div className="max-w-[720px]">
      <Link
        href="/dashboard"
        className="mb-6 inline-block font-mono text-[10.5px] tracking-[0.14em] text-muted hover:text-fg"
      >
        ← WALLET
      </Link>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
            [ Support ]
          </p>
          <h1 className="font-display text-[clamp(22px,3vw,30px)] font-black uppercase leading-none tracking-[-0.02em]">
            {ticket.subject}
          </h1>
        </div>
        <span
          className="rounded-md px-2.5 py-1.5 font-mono text-[9px] tracking-[0.12em]"
          style={{
            background: `color-mix(in oklab, ${STATUS_TONE[ticket.status]} 16%, transparent)`,
            color: STATUS_TONE[ticket.status],
          }}
        >
          {STATUS_LABEL[ticket.status].toUpperCase()}
        </span>
      </div>

      <div className="mb-4 flex flex-col gap-2.5">
        {ticket.messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "max-w-[88%] whitespace-pre-line rounded-xl border px-4 py-3 text-[13.5px] leading-[1.6]",
              message.role === "MEMBER"
                ? "self-end rounded-br-[4px] border-transparent bg-primary text-on-primary"
                : "self-start rounded-bl-[4px] border-hair bg-surface",
            )}
          >
            {message.body}
            <span
              className={cn(
                "mt-2 block font-mono text-[9px] tracking-[0.1em]",
                message.role === "MEMBER" ? "text-on-primary/70" : "text-muted",
              )}
            >
              {message.role === "MEMBER" ? "YOU" : "JAISARA"} ·{" "}
              {new Date(message.createdAt).toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <p role="alert" className="mb-3 text-[12.5px] text-danger">
          {error}
        </p>
      )}

      {ticket.status === "CLOSED" ? (
        <p className="rounded-[12px] border border-hair p-4 text-[12.5px] leading-6 text-muted">
          This ticket is closed. If it comes up again, start a new one from the assistant and
          mention this ticket.
        </p>
      ) : (
        <form onSubmit={reply} className="flex items-end gap-2.5">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={3}
            placeholder="Add anything that would help…"
            aria-label="Your reply"
            className="min-h-[84px] flex-1 rounded-[12px] border border-hair bg-surface-2 p-3.5 text-[13.5px] leading-6 outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            className="cursor-pointer rounded-[11px] bg-primary px-5 py-3.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-on-primary disabled:opacity-50"
          >
            {busy ? "Sending…" : "Reply"}
          </button>
        </form>
      )}
    </div>
  );
}
