"use client";

import type { ReactNode, Ref } from "react";
import { cn } from "@/lib/cn";

/**
 * The support desk's furniture, from the design file.
 *
 * The whole panel is a docket: the header sits on a raised strip, a punched
 * perforation runs under it, and every card that represents a conversation
 * carries a torn left edge. Those perforations are drawn with layered radial
 * gradients rather than images so they recolour with the theme — there are
 * fifteen palettes and a PNG would be wrong in fourteen of them.
 */

/** A scrolling body. Every view is one of these, so scrolling behaves uniformly. */
export function Scroller({
  children,
  className,
  ref,
}: {
  children: ReactNode;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}) {
  return (
    <div ref={ref} className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain", className)}>
      {children}
    </div>
  );
}

/**
 * The punched strip under the header.
 *
 * Two stacked gradients: the top one paints the notch in the panel's own
 * surface, the one beneath it draws a slightly larger disc in a hairline tint
 * so each notch reads as a cut edge rather than a hole.
 */
export function Perforation() {
  return (
    <div
      aria-hidden
      className="h-[10px] flex-none bg-surface-2"
      style={{
        backgroundImage:
          "radial-gradient(circle at 5px 10px, var(--surface) 0 5px, transparent 5.5px), radial-gradient(circle at 5px 10px, color-mix(in oklab, var(--text) 13%, transparent) 0 6px, transparent 6.3px)",
        backgroundSize: "14px 10px",
      }}
    />
  );
}

/** The torn left edge on a conversation card — the receipt stub. */
export function PerforatedEdge() {
  return (
    <span
      aria-hidden
      className="absolute inset-y-0 left-0 w-[9px]"
      style={{
        backgroundImage:
          "radial-gradient(circle at 4.5px 6px, var(--surface) 0 3px, transparent 3.2px), radial-gradient(circle at 4.5px 6px, color-mix(in oklab, var(--text) 13%, transparent) 0 3.8px, transparent 4.1px)",
        backgroundSize: "9px 12px",
      }}
    />
  );
}

/**
 * The desk's masthead.
 *
 * Two overlapping monograms — the platform and the person who answers — so it
 * reads as a desk with someone behind it rather than a bot. The status line is
 * the one place the panel makes a promise about time, so it is drawn from real
 * state rather than a constant.
 */
export function DeskHeader({ status, onClose }: { status: string; onClose: () => void }) {
  return (
    <header className="flex flex-none items-center gap-[13px] bg-surface-2 px-4 pb-3.5 pt-[17px]">
      <span className="flex flex-none">
        <span className="grid size-8 place-items-center rounded-[10px] border-2 border-surface-2 bg-primary font-display text-[13px] font-black text-on-primary">
          J
        </span>
        <span
          className="-ml-[11px] grid size-8 place-items-center rounded-[10px] border-2 border-surface-2 font-display text-[13px] font-black text-club"
          style={{ background: "color-mix(in oklab, var(--club) 26%, var(--surface))" }}
        >
          M
        </span>
      </span>

      <span className="min-w-0 flex-1">
        <span className="block font-display text-[15px] font-bold tracking-[-0.01em]">
          Support desk
        </span>
        <span className="mt-1 flex items-center gap-1.5">
          <span
            className="size-[6px] flex-none rounded-[2px] bg-success"
            style={{ animation: "jsBlink 2.2s ease-in-out infinite" }}
          />
          <span className="font-mono text-[9.5px] tracking-[0.1em] text-muted">{status}</span>
        </span>
      </span>

      <button
        type="button"
        onClick={onClose}
        aria-label="Close support"
        className="grid size-[30px] flex-none cursor-pointer place-items-center rounded-[9px] text-base leading-none text-muted transition hover:bg-surface hover:text-fg"
      >
        ×
      </button>
    </header>
  );
}

/** The header on a pushed view: one tap back, and what you are looking at. */
export function DetailHeader({
  title,
  meta,
  onBack,
}: {
  title: string;
  meta?: string;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-none items-center gap-[11px] border-b border-hair-soft px-[15px] pb-3 pt-[13px]">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className="grid size-[30px] flex-none cursor-pointer place-items-center rounded-[9px] border border-hair text-sm text-muted transition hover:border-primary hover:text-fg"
      >
        ←
      </button>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-sm font-semibold leading-[1.3]">
          {title}
        </span>
        {meta && (
          <span className="mt-1 block font-mono text-[9px] tracking-[0.12em] text-muted">
            {meta}
          </span>
        )}
      </span>
    </div>
  );
}

export type Tab = "home" | "answers" | "threads";

/** The bottom tab bar. Only on root views — a pushed view owns its own header. */
export function TabBar({
  value,
  onChange,
  ticketCount,
}: {
  value: Tab;
  onChange: (tab: Tab) => void;
  ticketCount: number;
}) {
  const tabs: { key: Tab; label: string }[] = [
    { key: "home", label: "HOME" },
    { key: "answers", label: "ANSWERS" },
    { key: "threads", label: "TICKETS" },
  ];

  return (
    <nav
      aria-label="Support sections"
      className="flex flex-none gap-[5px] border-t border-hair-soft px-[9px] pb-2.5 pt-[9px]"
    >
      {tabs.map((tab) => {
        const active = value === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-[42px] flex-1 cursor-pointer items-center justify-center gap-[7px] rounded-[11px] font-mono text-[9.5px] tracking-[0.15em] transition",
              active ? "bg-surface-2 text-primary" : "text-muted hover:text-fg",
            )}
          >
            {tab.label}
            {/* Always rendered, including at zero — the count is part of the
                tab's shape, and having it appear only sometimes makes the bar
                jump the first time somebody raises a ticket. */}
            {tab.key === "threads" && (
              <span
                className="rounded-[5px] px-1.5 py-0.5 font-mono text-[9px] tracking-[0.02em]"
                style={
                  active
                    ? {
                        background: "color-mix(in oklab, var(--primary) 24%, transparent)",
                        color: "var(--primary)",
                      }
                    : { background: "var(--surface-2)", color: "var(--text-muted)" }
                }
              >
                {ticketCount}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

const STATUS_LABEL: Record<string, string> = {
  OPEN: "WITH US",
  WAITING_ON_MEMBER: "ANSWERED",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
};

/**
 * Warning while it is ours to answer, success once it is not.
 *
 * The tone tracks *whose move it is*, not how good the news is: a thread
 * sitting with us is the one that needs chasing, so it is the one that catches
 * the eye.
 */
const STATUS_TONE: Record<string, string> = {
  OPEN: "var(--warning)",
  WAITING_ON_MEMBER: "var(--success)",
  RESOLVED: "var(--success)",
  CLOSED: "var(--text-muted)",
};

export function statusLabel(status: string): string {
  return STATUS_LABEL[status] ?? status;
}

export function statusTone(status: string): string {
  return STATUS_TONE[status] ?? "var(--text-muted)";
}

/** An outlined status chip — the design's colour-on-transparent, not a fill. */
export function StatusPill({ status }: { status: string }) {
  const tone = statusTone(status);

  return (
    <span
      className="inline-flex flex-none items-center rounded-md border px-2 py-[3px] font-mono text-[9px] tracking-[0.12em]"
      style={{ borderColor: tone, color: tone }}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

/**
 * A short ticket reference.
 *
 * The design prints `JSR-4471`. Ours is derived from the ticket's own uuid so
 * it is stable and unique without a second column — the member quotes it, we
 * search on it, and it never disagrees with the row it names.
 */
export function ticketRef(id: string): string {
  const digits = id.replace(/\D/g, "");
  return `JSR-${digits.slice(-4).padStart(4, "0")}`;
}

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-busy className="space-y-2.5 p-4">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="h-[74px] animate-pulse rounded-[14px] bg-surface-2" />
      ))}
    </div>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="px-5 py-8 text-center text-[13px] leading-6 text-muted">{children}</p>;
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="px-4 py-3 font-mono text-[10.5px] leading-5 text-danger">
      {children}
    </p>
  );
}

/** Compact elapsed time, in the mono the rest of the panel uses for figures. */
export function ago(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "NOW";
  if (minutes < 60) return `${minutes}M`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}H`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}D`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/**
 * The last line of a conversation, prefixed with who said it.
 *
 * "You: …" versus "Meera: …" is what makes a list of threads scannable — the
 * subject says what it is about, this says whether the ball is in your court.
 * The agent's own name is used when we have it; a thread answered by somebody
 * who has since left the team falls back to the platform.
 */
export function lastLine(
  message: { role: "MEMBER" | "AGENT" | "BOT"; body: string; author?: string | null } | null,
): string {
  if (!message) return "Nothing written yet";

  const who =
    message.role === "MEMBER"
      ? "You"
      : message.role === "AGENT"
        ? (message.author?.split(" ")[0] ?? "Jaisara")
        : "Assistant";

  return `${who}: ${message.body}`;
}
