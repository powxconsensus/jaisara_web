"use client";

import { apiErrorMessage } from "@/lib/auth-types";

/**
 * Everything the support widget talks to.
 *
 * One module rather than fetches scattered through five components: the widget
 * is the *only* place a member sees a ticket now, so the set of calls it makes
 * is worth being able to read in one sitting.
 */

export interface QuickOption {
  topic: string;
  label: string;
  /** Groups the list in the Answers view. Printed verbatim between brackets. */
  category: string;
}

export interface ChatTurn {
  role: "member" | "assistant";
  body: string;
}

/** Where the scripted conversation has got to. Echoed back on the next turn. */
export type Stage = "asking" | "offered" | "collecting" | "ready";

/** A button the assistant offered, sent back instead of typed text. */
export type Intent = "escalate_yes" | "escalate_no" | "extras_done";

export interface Choice {
  label: string;
  intent: Intent;
}

export interface ChatReply {
  body: string;
  action: { label: string; href: string } | null;
  stage: Stage;
  choices: Choice[] | null;
  source: "data" | "article" | "assistant" | "scripted";
  articleSlug?: string;
}

export interface StagedAttachment {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

/** Mirrors the API's cap; quoted to the member before they pick a file. */
export const ATTACHMENT_MAX_BYTES = 8 * 1024 * 1024;

export type TicketStatus = "OPEN" | "WAITING_ON_MEMBER" | "RESOLVED" | "CLOSED";

export interface TicketSummary {
  id: string;
  subject: string;
  status: TicketStatus;
  category: string;
  createdAt: string;
  updatedAt: string;
  unread: boolean;
  lastMessage: {
    role: "MEMBER" | "AGENT";
    body: string;
    createdAt: string;
    /** The agent's display name, so a preview can name who replied. */
    author: string | null;
  } | null;
  _count: { messages: number };
}

export interface TicketMessage {
  id: string;
  role: "MEMBER" | "AGENT" | "BOT";
  body: string;
  createdAt: string;
  /** Who wrote it, when a person did. */
  author: { displayName: string | null } | null;
}

export interface Ticket {
  id: string;
  subject: string;
  status: TicketStatus;
  category: string;
  createdAt: string;
  messages: TicketMessage[];
}

export interface HelpArticleSummary {
  slug: string;
  title: string;
  excerpt: string | null;
  tags: string[];
}

export interface HelpArticle {
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
}

/** Thrown with a message already fit to show a member. */
export class SupportError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { cache: "no-store", ...init });
  } catch {
    throw new SupportError("I could not reach the support service just now.");
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new SupportError(apiErrorMessage(body, "That did not work. Try again in a moment."));
  }
  return body as T;
}

function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export const supportApi = {
  options: () =>
    request<{ options: QuickOption[]; freeChat: boolean; greeting: string }>(
      "/api/support/options",
    ),

  chat: (payload: {
    topic?: string;
    message?: string;
    intent?: Intent;
    stage: Stage;
    history: ChatTurn[];
  }) => post<ChatReply>("/api/support/chat", payload),

  /** Uploads before the ticket exists; the id is bound to it on escalation. */
  attach: async (file: File): Promise<StagedAttachment> => {
    const body = new FormData();
    body.set("file", file);

    const response = await fetch("/api/support/attachments", { method: "POST", body });
    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      throw new SupportError(apiErrorMessage(payload, "That file could not be attached."));
    }
    return payload as StagedAttachment;
  },

  escalate: (history: ChatTurn[], attachmentIds: string[] = []) =>
    post<{ id: string; subject: string; status: TicketStatus; createdAt: string }>(
      "/api/support/tickets",
      { history, attachmentIds },
    ),

  tickets: () => request<TicketSummary[]>("/api/support/tickets"),

  unread: () => request<{ unread: number }>("/api/support/unread"),

  ticket: (id: string) => request<Ticket>(`/api/support/tickets/${id}`),

  reply: (id: string, body: string) =>
    post<{ id: string; status: TicketStatus }>(`/api/support/tickets/${id}/messages`, { body }),

  /** Fire-and-forget: a badge that clears a moment late is not worth an error. */
  markRead: (id: string) => post(`/api/support/tickets/${id}/read`).catch(() => undefined),

  helpArticles: (search?: string) =>
    request<HelpArticleSummary[]>(
      search ? `/api/help?search=${encodeURIComponent(search)}` : "/api/help",
    ),

  helpArticle: (slug: string) => request<HelpArticle>(`/api/help/${encodeURIComponent(slug)}`),
};

/**
 * Keeps the pre-ticket conversation across a reload.
 *
 * `sessionStorage`, not `localStorage`: this is a conversation about somebody's
 * money on what may be a shared machine, and it should not outlive the tab.
 * Keyed by user id so signing in as somebody else never shows you their thread.
 */
const DRAFT_KEY = "jaisara.support.draft";

export function loadDraft<T>(userId: string | undefined): T | null {
  if (!userId || typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(`${DRAFT_KEY}.${userId}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveDraft(userId: string | undefined, value: unknown): void {
  if (!userId || typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(`${DRAFT_KEY}.${userId}`, JSON.stringify(value));
  } catch {
    // A full or blocked sessionStorage costs the member a saved draft, nothing
    // more. It must never take the widget down with it.
  }
}

export function clearDraft(userId: string | undefined): void {
  if (!userId || typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(`${DRAFT_KEY}.${userId}`);
  } catch {
    // As above.
  }
}
