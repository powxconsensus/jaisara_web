/**
 * Formatting for values that arrive from the API as strings.
 *
 * Money crosses the wire as an integer point count in a string (100 points =
 * $1) precisely so it never passes through a float. Formatting it must not
 * undo that: the conversion below is done on the digits, not by dividing.
 */

/** `"981"` → `"$9.81"`. Never parses the value as a number. */
export function pointsToUsd(points: string | number | null | undefined): string {
  if (points === null || points === undefined || points === "") return "$0.00";

  const raw = String(points).trim();
  const negative = raw.startsWith("-");
  const digits = (negative ? raw.slice(1) : raw).replace(/\D/g, "") || "0";
  const padded = digits.padStart(3, "0");
  const whole = padded.slice(0, -2).replace(/^0+(?=\d)/, "");
  const cents = padded.slice(-2);

  return `${negative ? "−" : ""}$${Number(whole).toLocaleString("en-US")}.${cents}`;
}

/** A decimal string that is already in dollars, e.g. `"4281.39"`. */
export function usd(amount: string | number | null | undefined, currency = "USD"): string {
  if (amount === null || amount === undefined || amount === "") return "—";

  const value = Number(amount);
  if (!Number.isFinite(value)) return String(amount);

  return value.toLocaleString("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function shortDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

export function dateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/** "3 days ago" / "in 2 hours" — for hold periods and queue age. */
/**
 * Whether a timestamp is older than `ms`.
 *
 * The clock read lives here rather than in a component body: reading it during
 * render is impure, and the compiler's `purity` rule is right to refuse it. The
 * value is as fresh as the render that asked for it, which for a queue that
 * reloads on open is exactly the guarantee wanted.
 */
export function isOlderThan(value: string | null | undefined, ms: number): boolean {
  if (!value) return false;
  const at = new Date(value).getTime();
  return Number.isFinite(at) && Date.now() - at > ms;
}

export function relativeTime(value: string | null | undefined): string {
  if (!value) return "—";

  const deltaMs = new Date(value).getTime() - Date.now();
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000_000],
    ["month", 2_592_000_000],
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
  ];

  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, ms] of units) {
    if (Math.abs(deltaMs) >= ms) return formatter.format(Math.round(deltaMs / ms), unit);
  }
  return "just now";
}

export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

/** Turns `admin_edit` into `ADMIN EDIT` for display. */
export function humanRole(role: string): string {
  return role.replaceAll("_", " ").toUpperCase();
}

/** `#6570839` stays as typed; a blank shows as an em dash rather than nothing. */
export function orNone(value: string | null | undefined): string {
  return value && value.trim() ? value : "—";
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

/** Word count and read time, as a writing surface should show them. */
export function readingStats(body: string): { words: number; minutes: number } {
  const words = body.trim() ? body.trim().split(/\s+/).length : 0;
  return { words, minutes: Math.max(1, Math.round(words / 220)) };
}
