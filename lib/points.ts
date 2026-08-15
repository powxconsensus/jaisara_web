/**
 * Presenting points.
 *
 * Points have been the ledger's unit of account since the first migration -
 * `LedgerEntry.points` is the authoritative figure and dollars are derived from
 * it, never stored twice. The API has always sent both. Only the product spoke
 * exclusively in dollars.
 *
 * Showing the points as well is not a rename of the dollar figure: it is the
 * underlying number finally being visible, with the rate that connects the two
 * stated next to it so nobody has to reverse-engineer it from a rounded total.
 */

/** `"14400"` → `"14,400"`. Points are integers and can be large. */
export function formatPoints(points: string | number | null | undefined): string {
  if (points === null || points === undefined || points === "") return "0";

  const raw = String(points).trim();
  const negative = raw.startsWith("-");
  const digits = (negative ? raw.slice(1) : raw).replace(/\D/g, "") || "0";

  return `${negative ? "−" : ""}${Number(digits).toLocaleString("en-US")}`;
}

/**
 * "100 points = $1" - the rate, in words, for wherever a points figure appears.
 *
 * Derived from the setting rather than written into the copy. A rate that is
 * configurable in the console and hard-coded in a sentence is a sentence that
 * quietly becomes false the first time somebody changes it.
 */
export function conversionLabel(pointsPerUsd: number): string {
  return `${Number(pointsPerUsd).toLocaleString("en-US")} points = $1`;
}
