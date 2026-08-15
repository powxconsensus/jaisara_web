/**
 * What to call a member on screen.
 *
 * Two fields can name somebody and either may be missing. A display name is
 * free text they typed; a username is the handle that also credits their
 * referrals. Left to each screen, this becomes four slightly different fallback
 * chains and one of them renders "Your name" to somebody who has clearly told
 * us who they are.
 *
 * Order: display name, then the handle, then nothing. The handle is a real
 * identifier the member chose - showing a placeholder above it would be
 * pretending we do not know something we do.
 */

export interface NamedUser {
  displayName?: string | null;
  username?: string | null;
}

/** The heading. Empty string when the account has neither, so callers can decide. */
export function primaryName(user: NamedUser | null | undefined): string {
  const name = user?.displayName?.trim();
  if (name) return name;

  const handle = user?.username?.trim();
  return handle ? `@${handle}` : "";
}

/**
 * The handle to show *beneath* the heading, or null.
 *
 * Null when it is already the heading: printing `@alice` twice, once as the
 * name and once under it, reads as a rendering bug rather than as emphasis.
 */
export function secondaryHandle(user: NamedUser | null | undefined): string | null {
  const handle = user?.username?.trim();
  if (!handle) return null;
  return user?.displayName?.trim() ? `@${handle}` : null;
}

/**
 * The short form for a greeting - first name, or the handle.
 *
 * "Good to see you, @alice" is a little informal, but it beats the alternative
 * of dropping the greeting entirely for anybody who never filled in a name.
 */
export function greetingName(user: NamedUser | null | undefined): string {
  const name = user?.displayName?.trim();
  if (name) return name.split(/\s+/)[0];

  const handle = user?.username?.trim();
  return handle ? `@${handle}` : "";
}

/**
 * Monogram initials.
 *
 * Falls through display name, then handle, then email local-part, so the avatar
 * is never a bare question mark for an account that has any identity at all.
 */
export function initialsFor(
  user: (NamedUser & { email?: string | null }) | null | undefined,
): string {
  const source = user?.displayName?.trim() || user?.username?.trim() || user?.email || "";

  return (
    source
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}
