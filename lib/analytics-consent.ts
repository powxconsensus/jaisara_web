/**
 * Whether the visitor has agreed to session replay.
 *
 * Clarity records the screen. On a marketing page that is a heatmap; on
 * `/dashboard` it is a recording of somebody's wallet balance, their claim
 * history and the receipts they uploaded, and on `/console` it is every member
 * record an administrator opens. It was initialised from the root layout, so it
 * ran on all of them, with no way for anybody to decline.
 *
 * Two independent controls, because they answer different questions:
 *
 *  - **Consent**, here. Undecided means *no*, and no script is loaded. There is
 *    no jurisdiction where opt-out-by-default is the safer reading, and the
 *    cost of being wrong is a recording of a stranger's finances.
 *  - **Route**, in `analytics-routes.ts`. Even granted, replay never runs on an
 *    authenticated or credential-bearing screen. Consent to being measured on a
 *    landing page is not consent to being filmed reading your own balance.
 *
 * `localStorage`, not a cookie and not session storage: it is a durable
 * preference the visitor set, it must survive closing the tab, and it is never
 * sent to a server - a consent choice that arrives in a request header is one
 * more thing carrying a person around the internet.
 */
const KEY = "jaisara.analytics-consent";

export type AnalyticsConsent = "granted" | "denied";

/** `null` is undecided, which behaves exactly like `denied` until answered. */
export function readConsent(): AnalyticsConsent | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw === "granted" || raw === "denied" ? raw : null;
  } catch {
    // Private mode, or storage disabled. Undecided, therefore no.
    return null;
  }
}

export function writeConsent(value: AnalyticsConsent): void {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    // The choice is lost on reload, which asks again. Annoying, and it fails in
    // the direction of not recording.
  }
  emit();
}

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribeConsent(listener: () => void): () => void {
  listeners.add(listener);
  // Another tab answering the banner should settle it here too.
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) listener();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Cached, because `useSyncExternalStore` compares snapshots by identity and a
 * fresh read each time would re-render forever. A string is its own identity,
 * so this only has to be a stable read rather than a stable object.
 */
export function consentSnapshot(): AnalyticsConsent | null {
  return readConsent();
}

/** Nothing is known on the server, and guessing "granted" is the bug. */
export function consentServerSnapshot(): AnalyticsConsent | null {
  return null;
}
