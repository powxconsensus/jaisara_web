/**
 * Where session replay never runs, whatever the visitor consented to.
 *
 * Consent and route are separate questions. Agreeing to be measured on a
 * landing page is not agreeing to be filmed while reading your own balance, and
 * an administrator who accepted a banner once did not agree to record every
 * member record they open afterwards.
 *
 * These prefixes map to real route groups rather than a guessed list:
 *
 *  - `/dashboard` — wallet, claims, receipts, account settings. A member's
 *    money and their uploaded documents.
 *  - `/console` — the admin surface. Every screen here is somebody else's data,
 *    and the person consenting is not the person recorded.
 *  - the auth screens — a password field is on the page. Clarity masks input
 *    values by default, but "the vendor says it masks" is a configuration
 *    claim, not a property of our code, and it is the wrong thing to be wrong
 *    about.
 *
 * A prefix missing from this list means analytics runs where it should not, so
 * it is written as a closed list of the authenticated areas rather than an
 * allow-list of the public ones - the public surface grows with every marketing
 * page, and forgetting to add one there costs a heatmap, while forgetting to
 * add one here costs a recording.
 */
const EXCLUDED_PREFIXES = [
  "/dashboard",
  "/console",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/auth",
] as const;

export function isAnalyticsAllowedOn(pathname: string): boolean {
  const path = pathname.toLowerCase();

  return !EXCLUDED_PREFIXES.some(
    // Exact, or a real segment boundary. A bare `startsWith` would also exclude
    // `/loginhelp`, and more importantly would *not* be obviously wrong.
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}
