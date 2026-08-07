import { NextResponse, type NextRequest } from "next/server";
import {
  applySessionResult,
  authenticatedRequest,
  readUpstreamBody,
} from "@/lib/auth-server";

/** The member's own club standing, the tier ladder and the leaderboard. */
async function forward(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await context.params;
    const suffix = path.map(encodeURIComponent).join("/");
    const result = await authenticatedRequest(
      request,
      `/club/${suffix}${request.nextUrl.search}`,
      { method: "GET" },
    );
    const body = await readUpstreamBody(result.upstream);
    const response =
      body === null
        ? new NextResponse(null, { status: result.upstream.status })
        : NextResponse.json(body, { status: result.upstream.status });
    return applySessionResult(response, result);
  } catch {
    return NextResponse.json(
      { message: "The club service is unavailable. Please try again." },
      { status: 503 },
    );
  }
}

export const GET = forward;
