import { NextResponse, type NextRequest } from "next/server";
import {
  applySessionResult,
  authenticatedRequest,
  readUpstreamBody,
} from "@/lib/auth-server";

/** The member's own assistant conversation and tickets. */
async function forward(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await context.params;
    const suffix = path.map(encodeURIComponent).join("/");
    const method = request.method;

    const result = await authenticatedRequest(
      request,
      `/support/${suffix}${request.nextUrl.search}`,
      {
        method,
        headers: { "content-type": "application/json" },
        body: method === "GET" ? undefined : await request.arrayBuffer(),
      },
    );

    const body = await readUpstreamBody(result.upstream);
    const response =
      body === null
        ? new NextResponse(null, { status: result.upstream.status })
        : NextResponse.json(body, { status: result.upstream.status });
    return applySessionResult(response, result);
  } catch {
    return NextResponse.json(
      { message: "The support service is unavailable. Please try again." },
      { status: 503 },
    );
  }
}

export const GET = forward;
export const POST = forward;
