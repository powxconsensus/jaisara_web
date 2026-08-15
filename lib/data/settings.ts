import { apiRequest } from "@/lib/auth-server";

/**
 * The settings the browser is allowed to know.
 *
 * Read on the server and passed down as props rather than fetched from the
 * client. These decide what a page *is* - whether the club renders or shows as
 * coming soon, what a points balance is worth - and fetching them after mount
 * means every visitor watches the answer arrive, which is the shimmer this
 * codebase keeps having to remove.
 */

export interface PublicSettings {
  /** How many points make a dollar. Always a power of ten. */
  pointsPerUsd: number;
  /** Whether the Jaisara Club is open, or shown as coming soon. */
  clubEnabled: boolean;
  clubScorePerReferral: number;
  clubScorePerUsd: number;
}

/**
 * Used when the API cannot be reached.
 *
 * Deliberately matches the API's own defaults. A page that renders the club as
 * closed because a request timed out would be a worse lie than one that renders
 * it open and 404s on the click.
 */
export const DEFAULT_PUBLIC_SETTINGS: PublicSettings = {
  pointsPerUsd: 100,
  clubEnabled: true,
  clubScorePerReferral: 100,
  clubScorePerUsd: 1,
};

const REVALIDATE_SECONDS = process.env.NODE_ENV === "development" ? 5 : 60;
const FETCH_TIMEOUT_MS = 5_000;

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export async function fetchPublicSettings(): Promise<PublicSettings> {
  try {
    const response = await apiRequest("/settings/public", {
      cache: "force-cache",
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return DEFAULT_PUBLIC_SETTINGS;

    const raw = (await response.json()) as Record<string, unknown>;

    return {
      pointsPerUsd: num(raw.points_per_usd, DEFAULT_PUBLIC_SETTINGS.pointsPerUsd),
      // Stored as 1/0 rather than a boolean, matching every other switch in the
      // settings table.
      clubEnabled: num(raw.club_enabled, 1) !== 0,
      clubScorePerReferral: num(
        raw.club_score_per_referral,
        DEFAULT_PUBLIC_SETTINGS.clubScorePerReferral,
      ),
      clubScorePerUsd: num(raw.club_score_per_usd, DEFAULT_PUBLIC_SETTINGS.clubScorePerUsd),
    };
  } catch {
    return DEFAULT_PUBLIC_SETTINGS;
  }
}
