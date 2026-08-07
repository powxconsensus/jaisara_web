import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth-cookies";
import type { AuthResult, TokenPair } from "@/lib/auth-types";

const API_BASE_URL = (process.env.API_BASE_URL ?? "http://localhost:4000/api").replace(/\/$/, "");
const DEFAULT_ACCESS_MAX_AGE = 15 * 60;
const DEFAULT_REFRESH_MAX_AGE = 30 * 24 * 60 * 60;

export function authApiUrl(path: string): URL {
  return new URL(`${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`);
}

export function upstreamHeaders(request: Request, json = true): Headers {
  const headers = new Headers();
  if (json) headers.set("content-type", "application/json");

  const userAgent = request.headers.get("user-agent");
  if (userAgent) headers.set("user-agent", userAgent);

  const forwardedFor =
    request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");
  if (forwardedFor) headers.set("x-forwarded-for", forwardedFor);

  return headers;
}

/**
 * Calls the API.
 *
 * `no-store` is the default because most callers are per-request, authenticated
 * reads — but it is a *default*, applied before the spread so a caller can ask
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

export async function responseFromUpstream(upstream: Response): Promise<NextResponse> {
  const body = await readUpstreamBody(upstream);
  return body === null
    ? new NextResponse(null, { status: upstream.status })
    : NextResponse.json(body, { status: upstream.status });
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

async function rotate(refreshToken: string, request: Request): Promise<TokenPair | undefined> {
  const upstream = await apiRequest("/auth/refresh", {
    method: "POST",
    headers: upstreamHeaders(request),
    body: JSON.stringify({ refreshToken }),
  });
  if (!upstream.ok) return undefined;
  return (await upstream.json()) as TokenPair;
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
