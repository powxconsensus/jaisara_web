/**
 * The markets a firm deals in.
 *
 * Mirrors the `PlatformCategory` enum in the API's Prisma schema. Kept as a
 * const array rather than a bare union so the console can render the options
 * without a second list going stale beside it — adding a market is one edit
 * here and one in the schema, and TypeScript catches everything downstream.
 */
export const PLATFORM_CATEGORIES = ["BROKER", "FUTURES", "FOREX", "CRYPTO"] as const;

export type PlatformCategory = (typeof PLATFORM_CATEGORIES)[number];

/** Sentence case for display; the enum is shouted, the UI should not be. */
export const CATEGORY_LABELS: Record<PlatformCategory, string> = {
  BROKER: "Broker",
  FUTURES: "Futures",
  FOREX: "Forex",
  CRYPTO: "Crypto",
};
