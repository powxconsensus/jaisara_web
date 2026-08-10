/**
 * The email a campaign is built from, and how it becomes HTML.
 *
 * Writing marketing HTML by hand is the reason campaigns do not get sent. It
 * is not ordinary HTML either — mail clients strip `<style>`, ignore most
 * modern CSS, and Outlook still renders through Word — so the safe subset is
 * narrow and unobvious, and getting it wrong is invisible until it lands in
 * somebody's inbox looking broken.
 *
 * So the studio edits a list of blocks and this compiles them. Every style is
 * inline, every colour is a literal (mail clients have no custom properties),
 * and the layout is a single centred column, which is the one thing that works
 * everywhere without tables.
 *
 * The compiled HTML is what gets stored and sent; the block list is stored
 * beside it so the studio can reopen it. Nothing downstream knows about blocks.
 */

export type BlockKind = "heading" | "text" | "image" | "button" | "divider" | "spacer";

export interface EmailBlock {
  id: string;
  kind: BlockKind;
  /** Heading, paragraph, or the label on a button. */
  text?: string;
  /** Image source, or the button's destination. */
  url?: string;
  /** Alt text. Required in spirit — a blocked image with no alt is a blank gap. */
  alt?: string;
}

export interface EmailDesign {
  version: 1;
  blocks: EmailBlock[];
}

/** Palette baked into the sent HTML. Mail clients cannot read CSS variables. */
const INK = "#12212b";
const RULE = "#dde5e8";
const ACCENT = "#0a8073";
const ON_ACCENT = "#ffffff";

export const BLOCK_LABELS: Record<BlockKind, string> = {
  heading: "Heading",
  text: "Paragraph",
  image: "Image",
  button: "Button",
  divider: "Divider",
  spacer: "Spacer",
};

/** A new block of each kind, pre-filled so it renders as something. */
export function newBlock(kind: BlockKind): EmailBlock {
  const id = `b_${Math.random().toString(36).slice(2, 10)}`;

  switch (kind) {
    case "heading":
      return { id, kind, text: "A short, specific headline" };
    case "text":
      return {
        id,
        kind,
        text: "Say the useful thing first. One idea per paragraph reads better on a phone, which is where most of this is opened.",
      };
    case "image":
      return { id, kind, url: "", alt: "" };
    case "button":
      return { id, kind, text: "See the deals", url: "" };
    default:
      return { id, kind };
  }
}

/** The design a brand-new campaign starts from. */
export function starterDesign(): EmailDesign {
  return {
    version: 1,
    blocks: [
      { ...newBlock("heading"), text: "Hello {{firstName}}," },
      newBlock("text"),
      { ...newBlock("button"), text: "See the deals" },
    ],
  };
}

export function isEmailDesign(value: unknown): value is EmailDesign {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<EmailDesign>;
  return candidate.version === 1 && Array.isArray(candidate.blocks);
}

/**
 * Escapes text for HTML.
 *
 * Campaign copy is written by an admin, but it still ends up inside markup we
 * generate — an unescaped `&` alone is enough to break a link, and an
 * unescaped `<` swallows the rest of the paragraph.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Whether a URL is safe to put in an email.
 *
 * `javascript:` in an `href` is the obvious one, but `data:` matters more here
 * — a data URI in an `<img>` is stripped by most clients and flagged by spam
 * filters, so an image pasted as base64 would silently vanish for recipients
 * while looking fine in the studio preview.
 */
export function isSafeUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^https?:\/\//i.test(trimmed) || trimmed.startsWith("{{");
}

/** One block as email-safe HTML. */
function renderBlock(block: EmailBlock): string {
  switch (block.kind) {
    case "heading":
      return `<h2 style="margin:0 0 12px;font-family:Helvetica,Arial,sans-serif;font-size:22px;line-height:1.3;font-weight:700;color:${INK}">${escapeHtml(block.text ?? "")}</h2>`;

    case "text":
      return `<p style="margin:0 0 14px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:${INK}">${escapeHtml(block.text ?? "").replace(/\n/g, "<br>")}</p>`;

    case "image": {
      if (!isSafeUrl(block.url ?? "")) return "";
      return `<img src="${escapeHtml(block.url!.trim())}" alt="${escapeHtml(block.alt ?? "")}" width="560" style="display:block;width:100%;max-width:560px;height:auto;border:0;border-radius:10px;margin:0 0 16px">`;
    }

    case "button": {
      if (!isSafeUrl(block.url ?? "")) return "";
      // A padded anchor rather than a table button: every client that matters
      // renders it, and it degrades to a plain link in the ones that do not.
      return `<p style="margin:0 0 18px"><a href="${escapeHtml(block.url!.trim())}" style="display:inline-block;padding:12px 22px;background:${ACCENT};color:${ON_ACCENT};font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px">${escapeHtml(block.text ?? "Open")}</a></p>`;
    }

    case "divider":
      return `<hr style="border:0;border-top:1px solid ${RULE};margin:0 0 18px">`;

    case "spacer":
      return `<div style="height:20px;line-height:20px;font-size:0">&nbsp;</div>`;
  }
}

/** The whole design as the HTML body that gets sent. */
export function compileHtml(design: EmailDesign): string {
  return design.blocks.map(renderBlock).filter(Boolean).join("\n");
}

/**
 * The plain-text alternative.
 *
 * Generated rather than typed. It used to be a second textarea the author had
 * to keep in sync by hand, which meant it was always the previous draft —
 * and a text part that contradicts the HTML is a spam signal on its own.
 */
export function compileText(design: EmailDesign): string {
  const lines: string[] = [];

  for (const block of design.blocks) {
    switch (block.kind) {
      case "heading":
        lines.push((block.text ?? "").toUpperCase(), "");
        break;
      case "text":
        lines.push(block.text ?? "", "");
        break;
      case "image":
        if (block.alt?.trim()) lines.push(`[${block.alt.trim()}]`, "");
        break;
      case "button":
        if (isSafeUrl(block.url ?? "")) {
          lines.push(`${block.text ?? "Open"}: ${block.url!.trim()}`, "");
        }
        break;
      case "divider":
        lines.push("—", "");
        break;
      case "spacer":
        lines.push("");
        break;
    }
  }

  // The footer template adds the unsubscribe line to both parts, so it is not
  // repeated here — two unsubscribe links in one email reads as a mistake.
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Every merge tag the sender substitutes, with what it becomes. */
export const MERGE_TAGS: { tag: string; label: string; sample: string }[] = [
  { tag: "{{firstName}}", label: "First name", sample: "Sara" },
  { tag: "{{email}}", label: "Their email", sample: "sara@example.com" },
  { tag: "{{unsubscribeUrl}}", label: "Unsubscribe link", sample: "https://…/unsubscribe?token=…" },
];

/** Substitutes the samples, for the studio preview only. */
export function withSampleValues(value: string): string {
  return MERGE_TAGS.reduce(
    (text, { tag, sample }) => text.replaceAll(tag, sample),
    value,
  );
}
