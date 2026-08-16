export interface AuthUser {
  id: string;
  email: string;
  displayName?: string | null;
  /** Absolute URL. Null or absent means show the monogram. */
  avatarUrl?: string | null;
  emailVerified: boolean;
  hasPassword?: boolean;
  /** Whether a Google account is connected. Undefined on an older session. */
  googleLinked?: boolean;
  referralCode?: string;
  /**
   * Current club tier, carried on the session.
   *
   * Rides along on a query every authenticated request already makes, so the
   * sidebar badge needs no request of its own - `/club` used to answer it, and
   * that endpoint is the most expensive read on any member screen.
   */
  clubTierKey?: string | null;
  /** The handle they chose. Also works as a referral code. */
  username?: string | null;
  pendingEmailChange?: {
    email: string;
    expiresAt: string;
  };
  roles: string[];
  permissions?: string[];
  rank?: number;
  sessionId?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  refreshExpiresIn: string;
}

export interface AuthResult extends TokenPair {
  deletionCancelled?: boolean;
  verificationEmailSent?: boolean;
  verificationExpiresAt?: string;
  user: AuthUser;
}

export interface ApiErrorBody {
  statusCode?: number;
  error?: string;
  message?: string | string[];
}

export function apiErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const message = (body as ApiErrorBody).message;
  if (Array.isArray(message)) return message[0] ?? fallback;
  return typeof message === "string" && message ? message : fallback;
}
