import { NextResponse } from "next/server";

import { authApiUrl } from "@/lib/auth-server";

/**
 * Whether this instance can actually serve, rather than whether it booted.
 *
 * The platform health check pointed at `/`, and `/` is statically prerendered -
 * it renders from the build output and touches nothing. So it answered 200 with
 * an `API_BASE_URL` that pointed nowhere, with private networking misconfigured,
 * with the API refusing every connection. **A deploy that could not reach its
 * own backend went green**, and the first sign was a member trying to sign in.
 *
 * That is the specific failure this route exists to catch: not "is the API
 * healthy" - the API reports on itself - but "can *this* web instance, with
 * *this* configuration, reach it at all".
 *
 * `no-store` and `force-dynamic` are load-bearing. A cached health check is a
 * health check that answers for a request it did not make, which is how the
 * static `/` gave the wrong answer in the first place.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Short on purpose. A probe that waits ten seconds to fail turns one unhealthy
 * instance into a queue of hanging health checks, and the platform's own
 * timeout will have given up long before this resolves anyway.
 */
const TIMEOUT_MS = 4_000;

export async function GET(): Promise<NextResponse> {
  const started = Date.now();

  let upstream: Response;
  try {
    upstream = await fetch(authApiUrl("/health/ready"), {
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    /**
     * The whole point of the route. A connection refused, a DNS failure or a
     * timeout are all "this deployment is misconfigured", and all of them
     * previously looked identical to a healthy site.
     *
     * The message is included because the platform's deploy log is where
     * somebody will read this, and "fetch failed" with no host is not a
     * diagnosis. `authApiUrl` carries no credentials, so naming the target is
     * safe.
     */
    return NextResponse.json(
      {
        status: "unreachable",
        api: authApiUrl("/health/ready").origin,
        error: (error as Error).message,
        ms: Date.now() - started,
      },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }

  // The API answers 503 itself when its database is unreachable. Forwarding
  // that rather than flattening it to "ok" is what stops a web instance
  // declaring itself ready in front of an API that has already said it is not.
  if (!upstream.ok) {
    return NextResponse.json(
      { status: "degraded", api: upstream.status, ms: Date.now() - started },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }

  return NextResponse.json(
    { status: "ok", api: upstream.status, ms: Date.now() - started },
    { headers: { "cache-control": "no-store" } },
  );
}
