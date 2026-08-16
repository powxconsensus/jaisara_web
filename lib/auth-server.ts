import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth-cookies";
import type { AuthResult, TokenPair } from "@/lib/auth-types";

const API_BASE_URL = resolveApiBaseUrl();
const DEFAULT_ACCESS_MAX_AGE = 15 * 60;
const DEFAULT_REFRESH_MAX_AGE = 30 * 24 * 60 * 60;

/**
 * Where the API lives - **including its global prefix**, which is the whole
 * reason this is a function and not a one-line default.
 *
 * The API mounts every route under `API_PREFIX` (`api` unless changed), so a
 * base URL without it produces a 404 on every server-side call. That much is
 * obvious. What is not obvious is where it surfaces: the first thing anyone
 * notices is Google sign-in, because it is the one flow that puts the composed
 * URL in the address bar. `/api/auth/google` on this origin redirects to
 * `<base>/auth/google`, and with the prefix missing the browser lands on the
 * API's own 404 page instead of Google's consent screen -
 *
 *     {"statusCode":404,"message":"Cannot GET /auth/google","path":"/auth/google"}
 *
 * - which reads like a broken OAuth setup and sends you to the Google Cloud
 * console, where nothing is wrong. Failing here instead costs one deploy and
 * names the actual fix.
 */
function resolveApiBaseUrl(): string {
  const raw = (process.env.API_BASE_URL ?? "http://localhost:4000/api").trim().replace(/\/$/, "");

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(
      `API_BASE_URL is "${raw}", which is not a URL. It must be the API's full base, ` +
        "scheme and prefix included - e.g. https://api.example.com/api",
    );
  }

  if (url.pathname === "" || url.pathname === "/") {
    throw new Error(
      `API_BASE_URL is "${raw}", which has no path. It must end with the API's global ` +
        "prefix - every route is mounted under it, so without one every request 404s. " +
        `Set it to "${raw}/api" (or whatever API_PREFIX is on the API).\n\n` +
        "If the API really does run with an empty API_PREFIX, this check is the one " +
        "thing to relax - it is the only case where a path-less value is correct.",
    );
  }

  return raw;
}

export function authApiUrl(path: string): URL {
  return new URL(`${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`);
}

export function upstreamHeaders(request: Request, json = true): Headers {
  const headers = new Headers();
  if (json) headers.set("content-type", "application/json");

  const userAgent = request.headers.get("user-agent");
  if (userAgent) headers.set("user-agent", userAgent);

  const clientIp = trustedClientIp(request);
  if (clientIp) headers.set("x-forwarded-for", clientIp);

  return headers;
}

/**
 * The one address in `x-forwarded-for` that a caller could not have written.
 *
 * `X-Forwarded-For` grows left to right: each proxy **appends** the address it
 * received the request from. So everything except the final entry is hearsay -
 * it is whatever the previous hop was told, and the first entry is simply a
 * string the browser sent. Only the last entry was written by our own edge,
 * about a connection it actually terminated.
 *
 * This forwarded the header verbatim. A request with a handmade
 * `X-Forwarded-For: 1.2.3.4` arrived at the platform edge, which appended the
 * real address, and the whole thing - forgery in front - was passed to the API.
 * Everything the API keys on an address then inherits the forgery: per-IP
 * throttles are diluted by picking a fresh value per request, `signupIp` and
 * the claim-attempt `ipHash` record an attacker-chosen string as evidence, and
 * the lockout counters can be aimed. None of it fails loudly, because a spoofed
 * address is a perfectly well-formed one.
 *
 * Taking the last entry is what "trust exactly one hop" means on this side of
 * the wire; `app.set('trust proxy', 1)` is the same statement on the other.
 */
function trustedClientIp(request: Request): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    const hops = forwardedFor
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

    if (hops.length > 0) return hops[hops.length - 1];
  }

  // Single-valued and set by the proxy rather than assembled from a list, so
  // there is no untrusted prefix to strip.
  return request.headers.get("x-real-ip");
}

/**
 * Calls the API.
 *
 * `no-store` is the default because most callers are per-request, authenticated
 * reads - but it is a *default*, applied before the spread so a caller can ask
 * for a cached, revalidating fetch instead. It used to be applied after, which
 * silently overrode the caller and left `no-store` paired with a `revalidate`
 * window; that contradiction deadlocked the prerender of every marketing page.
 */
export async function apiRequest(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  return fetch(authApiUrl(path), {
    cache: "no-store",
    ...init,
  });
}

export async function readUpstreamBody(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
}

/**
 * Turns an upstream response into one for the browser.
 *
 * Files stream through untouched; everything else is re-serialised as JSON.
 * The type check is here rather than at each call site because every BFF route
 * shares this helper, and the failure it prevents is silent: a binary response
 * that goes down the JSON path comes out as `{ message: "<mangled bytes>" }`
 * with no error anywhere, which is exactly how the receipt viewer broke.
 */
export async function responseFromUpstream(upstream: Response): Promise<NextResponse> {
  if (!isPayloadUpstream(upstream)) return fileFromUpstream(upstream);

  const body = await readUpstreamBody(upstream);
  return body === null
    ? new NextResponse(null, { status: upstream.status })
    : NextResponse.json(body, { status: upstream.status });
}

/**
 * Should this response be re-serialised as a payload, or handed over as a file?
 *
 * Deliberately narrow. Anything JSON is a payload, and so is anything textual -
 * plain text and HTML are what a gateway or a crashing proxy answers with, and
 * `readUpstreamBody` turns those into `{ message }` so the client still shows
 * something useful. Only content types that describe a *document* take the file
 * path: images, PDFs, CSV exports, raw bytes.
 *
 * Getting this backwards in either direction is quiet rather than loud, which
 * is why it is one function with tests rather than a check at each call site: a
 * file treated as a payload is a corrupted download, and an error treated as a
 * file is a blank screen where a message should be.
 */
export function isPayloadUpstream(upstream: Response): boolean {
  const type = (upstream.headers.get("content-type") ?? "").toLowerCase();

  if (type === "") return true;
  if (/^application\/(json|problem\+json)/.test(type)) return true;
  // `text/csv` is an export, not a message - everything else textual is one.
  if (/^text\/(plain|html)/.test(type)) return true;

  return false;
}

/**
 * Hands a non-JSON upstream response straight to the browser.
 *
 * The admin proxy used to run **every** response through `readUpstreamBody`,
 * which calls `.text()` and, when the result will not parse as JSON, returns
 * `{ message: text }`. For the one binary route behind that proxy - the
 * uploaded receipt - that produced a JSON document containing PNG bytes
 * decoded as UTF-8: the `<img>` failed, and opening it directly showed
 * `{"message":"PNG\r\n..."}`. The bytes were also corrupt by then, since
 * arbitrary binary does not survive a UTF-8 decode, so nothing downstream could
 * have recovered the image.
 *
 * The body is streamed rather than buffered, and only the headers that describe
 * the bytes are forwarded. `Cache-Control` comes from the API deliberately - it
 * sends `private, no-store` for receipts, which are one member's documents and
 * must not sit in a shared cache.
 *
 * `nosniff` and the sandbox are set here rather than trusted from upstream: this
 * renders in an authenticated origin, and the content type describes a file a
 * member uploaded.
 */
export function fileFromUpstream(upstream: Response): NextResponse {
  const headers = new Headers();

  for (const name of ["content-type", "content-length", "content-disposition"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }

  headers.set("cache-control", upstream.headers.get("cache-control") ?? "private, no-store");
  headers.set("x-content-type-options", "nosniff");
  headers.set("content-security-policy", "default-src 'none'; sandbox");

  return new NextResponse(upstream.body, { status: upstream.status, headers });
}

export function setAuthCookies(response: NextResponse, tokens: TokenPair): void {
  const secure = process.env.NODE_ENV === "production";

  response.cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: durationSeconds(tokens.expiresIn, DEFAULT_ACCESS_MAX_AGE),
  });
  response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: durationSeconds(tokens.refreshExpiresIn, DEFAULT_REFRESH_MAX_AGE),
  });
}

export function clearAuthCookies(response: NextResponse): void {
  response.cookies.set(ACCESS_TOKEN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set(REFRESH_TOKEN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function forwardPublicJson(
  request: NextRequest,
  path: string,
): Promise<NextResponse> {
  try {
    const upstream = await apiRequest(path, {
      method: "POST",
      headers: upstreamHeaders(request),
      body: await request.text(),
    });
    return responseFromUpstream(upstream);
  } catch {
    return NextResponse.json(
      { message: "The authentication service is unavailable. Please try again." },
      { status: 503 },
    );
  }
}

export interface AuthenticatedUpstream {
  upstream: Response;
  tokens?: TokenPair;
}

export async function authenticatedRequest(
  request: NextRequest,
  path: string,
  init: RequestInit = {},
): Promise<AuthenticatedUpstream> {
  const cookieStore = await cookies();
  let accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  let refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
  let tokens: TokenPair | undefined;

  if ((!accessToken || tokenExpired(accessToken)) && refreshToken) {
    tokens = await rotate(refreshToken, request);
    accessToken = tokens?.accessToken;
    refreshToken = tokens?.refreshToken ?? refreshToken;
  }

  if (!accessToken) {
    return {
      upstream: Response.json({ message: "Please sign in to continue" }, { status: 401 }),
    };
  }

  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${accessToken}`);
  const forwarded = upstreamHeaders(request, false);
  for (const [key, value] of forwarded) headers.set(key, value);

  let upstream = await apiRequest(path, { ...init, headers });

  if (upstream.status === 401 && refreshToken && !tokens) {
    tokens = await rotate(refreshToken, request);
    if (tokens) {
      headers.set("authorization", `Bearer ${tokens.accessToken}`);
      upstream = await apiRequest(path, { ...init, headers });
    }
  }

  return { upstream, tokens };
}

export function applySessionResult(
  response: NextResponse,
  result: AuthenticatedUpstream,
): NextResponse {
  if (result.tokens) setAuthCookies(response, result.tokens);
  if (result.upstream.status === 401) clearAuthCookies(response);
  return response;
}

export async function currentRefreshToken(): Promise<string | undefined> {
  return (await cookies()).get(REFRESH_TOKEN_COOKIE)?.value;
}

/**
 * Rotation state, shared across every route handler in this process.
 *
 * On `globalThis` rather than as a plain module-level `Map` for the same reason
 * the Prisma client is: route handlers are bundled per route, so a module-level
 * value can end up duplicated per bundle and per HMR reload - and a
 * single-flight map that is not actually single is just a slower race.
 */
const rotationState = ((globalThis as GlobalWithRotations).__jaisaraRotations ??= {
  inFlight: new Map<string, Promise<TokenPair | undefined>>(),
  settled: new Map<string, { tokens: TokenPair; at: number }>(),
});

interface GlobalWithRotations {
  __jaisaraRotations?: {
    inFlight: Map<string, Promise<TokenPair | undefined>>;
    settled: Map<string, { tokens: TokenPair; at: number }>;
  };
}

/**
 * How long a spent refresh token keeps answering with its replacement.
 *
 * Long enough to cover requests that read the cookie jar before the rotation
 * landed - a page load fires its authenticated calls within a few hundred
 * milliseconds of each other - and short enough that the pair is gone from
 * memory long before the access token it carries expires.
 */
const ROTATION_GRACE_MS = 60_000;

/**
 * Exchanges a refresh token, once, however many callers ask at the same time.
 *
 * This is the fix for the site signing people out on its own. Refresh tokens
 * are single-use *and* carry reuse detection: presenting one that has already
 * been rotated is treated as a stolen credential and revokes the entire family
 * - correctly, because that is what a leak looks like.
 *
 * The trouble is that one page load is many requests. `/api/auth/me` and
 * `/api/wallet` are mounted on every screen, the dashboard adds `/api/club` and
 * more, and each one is a separate route handler that reads the same cookie jar
 * and independently decides the access token has expired. Fifteen minutes after
 * signing in, they would all present the same refresh token at once: the first
 * rotated it, the rest looked exactly like the attack, and the family - the
 * fresh token included - was revoked. The user was signed out, having done
 * nothing but load a page.
 *
 * So concurrent callers share one upstream call, and for a short window
 * afterwards a straggler that still holds the spent token is handed the same
 * replacement rather than being sent upstream to trip the alarm. The alarm
 * itself is untouched: a token replayed after the window, or one from a family
 * this process never rotated, still revokes everything.
 *
 * Per process, which is the honest limit - two instances behind a load balancer
 * can still each rotate once. The API's own grace window covers that case by
 * declining the second request without revoking the family.
 */
export async function rotate(refreshToken: string, request: Request): Promise<TokenPair | undefined> {
  const now = Date.now();
  for (const [key, entry] of rotationState.settled) {
    if (now - entry.at > ROTATION_GRACE_MS) rotationState.settled.delete(key);
  }

  const settled = rotationState.settled.get(refreshToken);
  if (settled) return settled.tokens;

  const pending = rotationState.inFlight.get(refreshToken);
  if (pending) return pending;

  const attempt = (async () => {
    const upstream = await apiRequest("/auth/refresh", {
      method: "POST",
      headers: upstreamHeaders(request),
      body: JSON.stringify({ refreshToken }),
    });
    if (!upstream.ok) return undefined;
    return (await upstream.json()) as TokenPair;
  })();

  rotationState.inFlight.set(refreshToken, attempt);
  try {
    const tokens = await attempt;
    // Only successes are remembered. A failure can be transient - the API
    // restarting mid-request - and caching that would keep the session locked
    // out for the whole window over something that would have worked on retry.
    if (tokens) rotationState.settled.set(refreshToken, { tokens, at: Date.now() });
    return tokens;
  } finally {
    rotationState.inFlight.delete(refreshToken);
  }
}

function durationSeconds(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const match = /^(\d+)(s|m|h|d)$/.exec(value.trim());
  if (!match) return fallback;

  const amount = Number(match[1]);
  const multipliers = { s: 1, m: 60, h: 3600, d: 86400 } as const;
  return amount * multipliers[match[2] as keyof typeof multipliers];
}

function tokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8"),
    ) as { exp?: number };
    return !payload.exp || payload.exp <= Math.floor(Date.now() / 1000) + 10;
  } catch {
    return true;
  }
}

export function isAuthResult(value: unknown): value is AuthResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<AuthResult>;
  return (
    typeof result.accessToken === "string" &&
    typeof result.refreshToken === "string" &&
    typeof result.expiresIn === "string" &&
    typeof result.refreshExpiresIn === "string" &&
    Boolean(result.user && typeof result.user.email === "string")
  );
}
