/**
 * Remembers that a signup is waiting on its verification link.
 *
 * The screen that says "check your inbox" replaced the signup form from React
 * state alone, so a refresh threw it away and put the form back - and the form
 * is the one thing that screen exists *not* to show. Somebody who reloads to
 * check whether anything happened is told to sign up again for an account they
 * already have, and signing up again returns "an account with that email
 * already exists".
 *
 * **Deliberately not the URL.** The obvious fix is `?email=…`, and an email
 * address is personal data: in the query string it lands in browser history, in
 * the `Referer` sent to every third party the next page touches, and in any log
 * that records paths. Session storage stays in the tab and reaches no server.
 *
 * Per-tab is also the right lifetime. This is "the signup I just did, here",
 * not a preference - a new tab should get the form, and closing the tab should
 * end it.
 */
const KEY = "jaisara.verification";

/**
 * Matched to the link's own hour.
 *
 * Restoring a day-old screen would offer to resend a link that expired long
 * ago, with wording that says one is already on its way.
 */
const MAX_AGE_MS = 60 * 60 * 1000;

export interface VerificationSession {
  email: string;
  emailSent: boolean;
}

interface Stored extends VerificationSession {
  at: number;
}

export function rememberVerification(value: VerificationSession): void {
  try {
    const payload: Stored = { ...value, at: Date.now() };
    sessionStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // Private-mode browsers and storage quotas both throw here. Losing the
    // restore is a worse screen after a refresh, not a broken signup.
  }
  emit();
}

export function recallVerification(): VerificationSession | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<Stored> | null;

    // Hand-edited, half-written, or from an older shape of this code. Anything
    // that is not exactly what was stored is treated as nothing.
    if (
      !parsed ||
      typeof parsed.email !== "string" ||
      parsed.email === "" ||
      typeof parsed.emailSent !== "boolean" ||
      typeof parsed.at !== "number"
    ) {
      forgetVerification();
      return null;
    }

    if (Date.now() - parsed.at > MAX_AGE_MS) {
      forgetVerification();
      return null;
    }

    return { email: parsed.email, emailSent: parsed.emailSent };
  } catch {
    return null;
  }
}

export function forgetVerification(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to do, and nothing depends on it having worked.
  }
  emit();
}

/**
 * Read as an external store rather than copied into React state.
 *
 * The obvious shape - restore it in an effect - is banned by
 * `react-hooks/set-state-in-effect`, and rightly: it renders the form, then
 * immediately renders something else. The other obvious shape, a lazy
 * `useState` initialiser, reads `sessionStorage` during the client's first
 * render while the server rendered `null`, which is a hydration mismatch.
 *
 * `useSyncExternalStore` is the case this exists for: a server snapshot that is
 * honestly `null`, a client snapshot read from the browser, and React handling
 * the difference rather than us hiding it.
 */
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribeVerification(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Cached by the raw string, because `getSnapshot` must be referentially stable.
 *
 * Returning a freshly parsed object each call makes React see a new value every
 * time it checks and re-render forever.
 */
let cachedRaw: string | null = null;
let cachedValue: VerificationSession | null = null;

export function verificationSnapshot(): VerificationSession | null {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(KEY);
  } catch {
    return null;
  }

  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedValue = recallVerification();
  }

  return cachedValue;
}

/** Nothing is remembered on the server, and pretending otherwise is the bug. */
export function verificationServerSnapshot(): VerificationSession | null {
  return null;
}
