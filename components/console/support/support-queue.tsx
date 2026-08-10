"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { useToast } from "@/components/shell/toast";
import {
  Badge,
  EmptyState,
  ErrorNote,
  LoadingRows,
  PageHeader,
  Panel,
  PanelHeader,
  RecordButton,
  RecordList,
  Textarea,
  type Tone,
} from "@/components/console/ui";
import { useAccess } from "@/components/console/use-permissions";
import { useMutation, useResource } from "@/lib/console-api";
import { dateTime, relativeTime } from "@/lib/console-format";
import { ADMIN_PERMISSIONS as P } from "@/lib/admin-types";

/**
 * The support queue.
 *
 * Oldest first within a status: answering newest-first is how the person who
 * has waited longest keeps waiting. The assistant's summary leads the detail
 * panel so an agent opens with context rather than a transcript — the raw
 * conversation is underneath, because a summary nobody can check is a summary
 * nobody should trust.
 */

type Status = "OPEN" | "WAITING_ON_MEMBER" | "RESOLVED" | "CLOSED";

const STATUS_TONE: Record<Status, Tone> = {
  OPEN: "warning",
  WAITING_ON_MEMBER: "info",
  RESOLVED: "success",
  CLOSED: "neutral",
};

const FILTERS: { value: Status | ""; label: string }[] = [
  { value: "OPEN", label: "Needs a reply" },
  { value: "WAITING_ON_MEMBER", label: "Waiting on member" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "", label: "All" },
];

type Counts = Record<Status, number> & { total: number };

interface TicketSummary {
  id: string;
  subject: string;
  status: Status;
  category: string;
  createdAt: string;
  firstResponseAt: string | null;
  user: { id: string; email: string; displayName: string | null };
  _count: { messages: number };
}

interface TicketDetail extends Omit<TicketSummary, "_count"> {
  summary: string | null;
  transcript: { role: string; body: string }[] | null;
  user: TicketSummary["user"] & {
    createdAt: string;
    clubTierKey: string | null;
    _count: { claims: number; withdrawals: number };
  };
  messages: {
    id: string;
    role: "MEMBER" | "AGENT" | "BOT";
    body: string;
    createdAt: string;
    author: { displayName: string | null } | null;
  }[];
  /** Ids only — the file is fetched through a permission-checked route. */
  attachments: { id: string; fileName: string; contentType: string; sizeBytes: number }[];
}

export function SupportQueue() {
  const { can } = useAccess();
  const { toast } = useToast();
  const [status, setStatus] = useState<Status | "">("OPEN");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const canReply = can(P.supportReply);
  const tickets = useResource<TicketSummary[]>("/api/admin/support/tickets", {
    query: { status: status || undefined, take: 50 },
  });
  const counts = useResource<Counts>("/api/admin/support/counts");
  const ticket = useResource<TicketDetail>(
    selectedId ? `/api/admin/support/tickets/${selectedId}` : null,
  );
  const { mutate, pending, error, setError } = useMutation();

  /**
   * Opens an attachment in a new tab.
   *
   * The signed URL is fetched on click rather than rendered into the list:
   * these expire in five minutes, and a page left open for an afternoon would
   * otherwise be a screen of dead links.
   */
  const openAttachment = async (ticketId: string, attachmentId: string) => {
    const result = await mutate<{ url: string }>(
      `/api/admin/support/tickets/${ticketId}/attachments/${attachmentId}`,
      { method: "GET" },
    );
    if (result?.url) window.open(result.url, "_blank", "noopener,noreferrer");
  };

  const rows = tickets.data ?? [];
  /** Tickets this filter is hiding, which is what an empty list has to explain. */
  const elsewhere = counts.data ? counts.data.total - rows.length : 0;

  const reply = async () => {
    if (!selectedId || !draft.trim()) return;
    const result = await mutate<{ emailed: boolean }>(
      `/api/admin/support/tickets/${selectedId}/reply`,
      { body: { body: draft.trim() } },
    );
    if (!result) return;

    setDraft("");
    toast(
      result.emailed ? "Replied — the member has been emailed." : "Replied. The email did not send.",
      result.emailed ? "success" : "warning",
    );
    await Promise.all([ticket.reload(), tickets.reload(), counts.reload()]);
  };

  const setTicketStatus = async (next: Status) => {
    if (!selectedId) return;
    const result = await mutate(`/api/admin/support/tickets/${selectedId}/status`, {
      body: { status: next },
    });
    if (!result) return;
    toast(`Marked ${next.toLowerCase().replaceAll("_", " ")}.`, "success");
    await Promise.all([ticket.reload(), tickets.reload(), counts.reload()]);
  };

  return (
    <div>
      <PageHeader
        eyebrow="OPERATIONS"
        title="Support"
        description="Tickets the assistant could not resolve, oldest first. Replying emails the member the text you wrote — they do not have to log in to read it."
      />

      {/* The counts are the point of this row, not decoration. The queue opens
          filtered to "needs a reply", and with everything answered that view is
          legitimately empty — which read as a broken console until the other
          filters could say how many tickets they were holding. */}
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const count = counts.data
            ? filter.value === ""
              ? counts.data.total
              : counts.data[filter.value]
            : null;

          return (
            <FilterChip
              key={filter.label}
              active={status === filter.value}
              onClick={() => {
                setStatus(filter.value);
                setSelectedId(null);
              }}
            >
              {filter.label}
              {count !== null && (
                <span className="ml-1.5 font-mono text-[10px] opacity-70">{count}</span>
              )}
            </FilterChip>
          );
        })}
      </div>

      {tickets.error && (
        <div className="mb-4">
          <ErrorNote>{tickets.error}</ErrorNote>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[330px_minmax(0,1fr)] xl:items-start">
        <RecordList className="max-h-[70vh] xl:sticky xl:top-[80px]">
          {tickets.loading && rows.length === 0 ? (
            <LoadingRows rows={4} />
          ) : rows.length === 0 ? (
            <div>
              <EmptyState
                title="Nothing waiting"
                message={
                  status === "OPEN"
                    ? "No tickets need a reply. The assistant is handling what comes in."
                    : "No tickets with this status."
                }
              />
              {/* An empty filter over a non-empty queue is the exact state that
                  made this page look broken. Say so, and offer the way out. */}
              {elsewhere > 0 && (
                <div className="px-4 pb-4 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setStatus("");
                      setSelectedId(null);
                    }}
                    className="cursor-pointer font-mono text-[9.5px] tracking-[0.13em] text-primary underline-offset-4 hover:underline"
                  >
                    {elsewhere} {elsewhere === 1 ? "TICKET" : "TICKETS"} UNDER ANOTHER STATUS →
                  </button>
                </div>
              )}
            </div>
          ) : (
            rows.map((row) => (
              <RecordButton
                key={row.id}
                active={selectedId === row.id}
                onClick={() => {
                  setSelectedId(row.id);
                  setDraft("");
                  setError(null);
                }}
              >
                <span className="flex items-center justify-between gap-2">
                  <Badge tone={STATUS_TONE[row.status]}>{row.status.replaceAll("_", " ")}</Badge>
                  {!row.firstResponseAt && row.status === "OPEN" && (
                    <span className="font-mono text-[8.5px] text-danger">NO REPLY YET</span>
                  )}
                </span>
                <strong className="mt-2 block text-[12.5px] leading-5">{row.subject}</strong>
                <span className="mt-1 block truncate text-[10.5px] text-muted">
                  {row.user.displayName ?? row.user.email}
                </span>
                <span className="mt-1 block font-mono text-[9px] tracking-[0.1em] text-muted">
                  {relativeTime(row.createdAt).toUpperCase()} · {row._count.messages} MSG
                </span>
              </RecordButton>
            ))
          )}
        </RecordList>

        {!selectedId ? (
          <Panel>
            <EmptyState
              title="Pick a ticket"
              message="Choose one to read the assistant's summary and the conversation behind it."
            />
          </Panel>
        ) : ticket.loading && !ticket.data ? (
          <Panel className="p-8">
            <div aria-busy className="h-[420px] animate-pulse rounded-[13px] bg-surface-2" />
          </Panel>
        ) : ticket.data ? (
          <div className="space-y-4">
            <Panel className="p-[clamp(18px,3vw,26px)]">
              <PanelHeader
                eyebrow={`${ticket.data.category} · ${ticket.data.user.email}`}
                title={ticket.data.subject}
                description={`Raised ${dateTime(ticket.data.createdAt)}. Member since ${dateTime(
                  ticket.data.user.createdAt,
                )}, ${ticket.data.user._count.claims} claims, ${ticket.data.user._count.withdrawals} payouts.`}
                actions={<Badge tone={STATUS_TONE[ticket.data.status]}>{ticket.data.status}</Badge>}
              />

              {ticket.data.summary && (
                <div
                  className="mt-5 rounded-[13px] border p-4"
                  style={{ borderColor: "color-mix(in oklab, var(--primary) 40%, transparent)" }}
                >
                  <p className="font-mono text-[9px] tracking-[0.16em] text-primary">
                    WHAT THE ASSISTANT MADE OF IT
                  </p>
                  <p className="mt-2 whitespace-pre-line text-[12.5px] leading-6 text-muted">
                    {ticket.data.summary}
                  </p>
                </div>
              )}
            </Panel>

            <Panel className="p-[clamp(18px,3vw,26px)]">
              <p className="mb-4 font-mono text-[9px] tracking-[0.18em] text-muted">CONVERSATION</p>
              <div className="flex flex-col gap-2.5">
                {ticket.data.messages.map((message) => (
                  <div
                    key={message.id}
                    className={
                      message.role === "MEMBER"
                        ? "max-w-[88%] self-start whitespace-pre-line rounded-xl rounded-bl-[4px] border border-hair bg-surface-2 px-4 py-3 text-[13px] leading-6"
                        : "max-w-[88%] self-end whitespace-pre-line rounded-xl rounded-br-[4px] border border-transparent bg-primary px-4 py-3 text-[13px] leading-6 text-on-primary"
                    }
                  >
                    {message.body}
                    <span
                      className={`mt-2 block font-mono text-[9px] tracking-[0.1em] ${
                        message.role === "MEMBER" ? "text-muted" : "text-on-primary/70"
                      }`}
                    >
                      {message.role === "MEMBER"
                        ? "MEMBER"
                        : (message.author?.displayName ?? "AGENT").toUpperCase()}{" "}
                      · {dateTime(message.createdAt)}
                    </span>
                  </div>
                ))}
              </div>

              {/* What the member attached while the assistant was gathering
                  detail. Fetched through a signed, short-lived link rather
                  than linked by storage key, so the permission check happens
                  per click and a copied URL stops working. */}
              {ticket.data.attachments && ticket.data.attachments.length > 0 && (
                <div className="mt-5 rounded-[13px] border border-hair p-4">
                  <p className="font-mono text-[9px] tracking-[0.14em] text-muted">
                    ATTACHED BY THE MEMBER
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {ticket.data.attachments.map((file) => (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() => void openAttachment(ticket.data!.id, file.id)}
                        className="flex cursor-pointer items-center gap-2.5 rounded-[10px] border border-hair bg-surface-2 px-3 py-2 transition hover:border-primary"
                      >
                        <span className="font-mono text-[9px] tracking-[0.1em] text-primary">
                          {file.contentType === "application/pdf" ? "PDF" : "IMG"}
                        </span>
                        <span className="max-w-[220px] truncate text-[12.5px]">
                          {file.fileName}
                        </span>
                        <span className="font-mono text-[9px] text-muted">
                          {Math.max(1, Math.round(file.sizeBytes / 1024))}KB
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {ticket.data.transcript && ticket.data.transcript.length > 0 && (
                <details className="mt-5 rounded-[13px] border border-hair p-4">
                  <summary className="cursor-pointer font-mono text-[9px] tracking-[0.14em] text-muted">
                    ASSISTANT TRANSCRIPT BEFORE ESCALATION
                  </summary>
                  <div className="mt-3 space-y-2 border-t border-hair-soft pt-3">
                    {ticket.data.transcript.map((turn, index) => (
                      <p key={index} className="text-[12px] leading-6 text-muted">
                        <span className="font-mono text-[9.5px] text-primary">
                          {turn.role === "member" ? "MEMBER" : "ASSISTANT"}:{" "}
                        </span>
                        {turn.body}
                      </p>
                    ))}
                  </div>
                </details>
              )}
            </Panel>

            {error && <ErrorNote>{error}</ErrorNote>}

            {canReply ? (
              <Panel className="p-[clamp(18px,3vw,26px)]">
                <PanelHeader
                  eyebrow="REPLY"
                  title="Answer the member"
                  description="They are emailed this text in full, so it reads on its own without opening the site."
                />
                <Textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={5}
                  placeholder="Write the reply…"
                  className="mt-5 min-h-[130px]"
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="lg" disabled={pending || !draft.trim()} onClick={() => void reply()}>
                    {pending ? "Sending…" : "Send reply"}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    disabled={pending}
                    onClick={() => void setTicketStatus("RESOLVED")}
                  >
                    Mark resolved
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    disabled={pending}
                    onClick={() => void setTicketStatus("CLOSED")}
                  >
                    Close
                  </Button>
                </div>
              </Panel>
            ) : (
              <Panel>
                <EmptyState
                  title="Read-only"
                  message="You can read the queue. Replying to a member needs the support:reply permission."
                />
              </Panel>
            )}
          </div>
        ) : (
          <Panel className="p-6">
            <ErrorNote>{ticket.error ?? "That ticket could not be loaded."}</ErrorNote>
          </Panel>
        )}
      </div>
    </div>
  );
}
