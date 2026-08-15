/**
 * The shape of the public settings, and what to assume without them.
 *
 * Split out from `settings.ts` because that module reaches for `next/headers`
 * to attach the session cookie, which makes it server-only - importing it from
 * a client component fails the build. The values themselves are just constants
 * and are needed on both sides, so they live here where either can read them.
 *
 * Keeping them in one file rather than retyping `100` in a client component is
 * the point: `points_per_usd` is runtime configuration, and a second copy of
 * the assumed default is how the two halves of the product start disagreeing
 * about what a balance is worth.
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
