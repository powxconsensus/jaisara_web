/**
 * The member's invite link.
 *
 * It used to arrive from `GET /club`, which is the single slowest thing the
 * dashboard asks for: that handler recalculates the member's tier before it
 * answers - counting qualified referrals, aggregating lifetime volume, reading
 * the tier ladder, and writing the result back - so a link that is nothing more
 * than an origin and a referral code waited on about eight round trips and a
 * database write.
 *
 * Both halves are already in the browser. The referral code arrives with the
 * session at sign-in, and the origin is the page the code is running on. So the
 * link is composed locally and renders on the first paint; `/club` still loads
 * in the background for the parts that genuinely need the server - referral
 * counts, tier standing, club earnings.
 */

/** The referral identifiers carried on the session. */
export interface InviteIdentity {
  referralCode?: string;
  username?: string | null;
}

/**
 * Prefers the username when the member has set one.
 *
 * `?ref=` accepts either, and a link somebody will paste into a Discord message
 * reads better as their name than as `A7K2M9QX`. The minted code stays the
 * fallback and never stops working - which is what makes a username safe to
 * give up at all.
 */
export function inviteRef(user: InviteIdentity | null | undefined): string {
  return user?.username || user?.referralCode || "";
}

/**
 * The absolute link, or an empty string when there is nothing to build from.
 *
 * `origin` is passed rather than read from `window` so this stays callable
 * during server rendering and from a test. An empty return is the honest
 * answer for a signed-out session - the caller renders a placeholder rather
 * than a link to `/signup?ref=`, which would attribute to nobody.
 */
export function buildInviteLink(
  user: InviteIdentity | null | undefined,
  origin: string,
): string {
  const ref = inviteRef(user);
  if (!ref || !origin) return "";
  return `${origin}/signup?ref=${encodeURIComponent(ref)}`;
}
