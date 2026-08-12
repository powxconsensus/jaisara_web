"use client";

import { useCallback, useEffect, useState } from "react";
import { SignedOutNote } from "./assistant";
import { supportApi, SupportError, type TicketSummary } from "./support-api";
import {
  ErrorNote,
  Note,
  PerforatedEdge,
  Scroller,
  Skeleton,
  StatusPill,
  ago,
  lastLine,
  ticketRef,
} from "./widget-ui";

/**
 * Every conversation, as a stack of receipt stubs.
 *
 * Closed threads stay - this list *is* the member's support history, and a
 * resolved ticket is often the fastest answer to the same question a month
 * later. Each card prints its reference so a member can quote it in an email
 * and an agent can find it.
 */
export function ThreadsView({
  signedIn,
  onOpen,
  onNew,
}: {
  signedIn: boolean;
  onOpen: (id: string) => void;
  onNew: () => void;
}) {
  const [tickets, setTickets] = useState<TicketSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!signedIn) return;
    try {
      setTickets(await supportApi.tickets());
    } catch (caught) {
      setError(
        caught instanceof SupportError ? caught.message : "Your conversations could not be loaded.",
      );
      setTickets([]);
    }
  }, [signedIn]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the setStates are inside load, behind an await
    void load();
  }, [load]);

  if (!signedIn) {
    return <SignedOutNote what="show you your conversations with us" />;
  }

  return (
    <Scroller className="flex flex-col gap-2.5 px-[17px] pb-[18px] pt-4">
      {error && <ErrorNote>{error}</ErrorNote>}

      {tickets === null ? (
        <Skeleton rows={3} />
      ) : (
        <>
          {tickets.length === 0 && (
            <Note>
              Nothing raised yet - most questions get answered straight from your account without
              one.
            </Note>
          )}

          {tickets.map((ticket, index) => (
            <button
              key={ticket.id}
              type="button"
              onClick={() => onOpen(ticket.id)}
              style={{
                // Staggered so the stack prints rather than appearing at once.
                animation: `jsUp .44s ${index * 60}ms cubic-bezier(.2,.8,.2,1) both`,
              }}
              className="relative flex-none cursor-pointer overflow-hidden rounded-[14px] bg-surface-2 py-[15px] pl-[23px] pr-4 text-left transition hover:translate-x-[3px]"
            >
              <PerforatedEdge />

              <span className="mb-[9px] flex items-center gap-2.5">
                <span className="font-mono text-[9px] tracking-[0.15em] text-muted">
                  {ticketRef(ticket.id)}
                </span>
                <span className="flex-1" />
                <StatusPill status={ticket.status} />
              </span>

              <span className="mb-[7px] flex items-center gap-2">
                {/* Only unread is marked. The status already has its own chip,
                    and a dot on every row would say nothing while making the
                    one row that matters harder to find. */}
                <span
                  className="size-[7px] flex-none rounded-[2px]"
                  style={{ background: ticket.unread ? "var(--primary)" : "transparent" }}
                />
                <span className="min-w-0 flex-1 font-display text-[14.5px] font-semibold leading-[1.35]">
                  {ticket.subject}
                </span>
              </span>

              <span className="flex items-baseline gap-2.5">
                <span className="min-w-0 flex-1 truncate text-[12.3px] text-muted">
                  {lastLine(ticket.lastMessage)}
                </span>
                <span className="flex-none font-mono text-[9px] tracking-[0.1em] text-muted">
                  {ago(ticket.lastMessage?.createdAt ?? ticket.updatedAt)}
                </span>
              </span>
            </button>
          ))}

          <button
            type="button"
            onClick={onNew}
            className="mt-0.5 flex min-h-[50px] flex-none cursor-pointer items-center justify-center gap-2 rounded-[13px] border border-dashed font-mono text-[10px] tracking-[0.15em] text-primary transition hover:bg-[color-mix(in_oklab,var(--primary)_10%,transparent)]"
            style={{ borderColor: "color-mix(in oklab, var(--primary) 48%, transparent)" }}
          >
            + NEW TICKET
          </button>

          <p className="flex-none px-2 pt-1.5 text-center font-mono text-[9px] tracking-[0.11em] text-muted">
            TICKETS ARE KEPT FOR 12 MONTHS
          </p>
        </>
      )}
    </Scroller>
  );
}
