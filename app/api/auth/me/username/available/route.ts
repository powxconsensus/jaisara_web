import { NextResponse, type NextRequest } from "next/server";
import {
  applySessionResult,
  authenticatedRequest,
  readUpstreamBody,
} from "@/lib/auth-server";

/**
 * Whether a username is free, for the live check as somebody types.
 *
 * Only the `username` parameter is forwarded. Passing the caller's query string
 * through wholesale would let anything appended to the URL reach the API, and
 * the upstream route is rate limited per caller - which is the control that
 * stops this being a way to enumerate who holds which handle.
 */
export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username") ?? "";
  const path = `/auth/me/username/available?username=${encodeURIComponent(username)}`;

  try {
    const result = await authenticatedRequest(request, path, { method: "GET" });
    const body = await readUpstreamBody(result.upstream);
    const response =
      body === null
        ? new NextResponse(null, { status: result.upstream.status })
        : NextResponse.json(body, { status: result.upstream.status });
    return applySessionResult(response, result);
  } catch {
    return NextResponse.json(
      { message: "The authentication service is unavailable. Please try again." },
      { status: 503 },
    );
  }
}
