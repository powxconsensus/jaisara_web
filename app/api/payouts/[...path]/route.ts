import { NextResponse, type NextRequest } from "next/server";
import {
  applySessionResult,
  authenticatedRequest,
  readUpstreamBody,
} from "@/lib/auth-server";

/** The member's own payout addresses, rewards, withdrawals and requests. */
async function forward(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await context.params;
    const suffix = path.map(encodeURIComponent).join("/");
    const method = request.method;
    const hasBody = !["GET", "HEAD"].includes(method);
    const contentType = request.headers.get("content-type");

    const result = await authenticatedRequest(
      request,
      `/payouts/${suffix}${request.nextUrl.search}`,
      {
        method,
        headers: contentType ? { "content-type": contentType } : undefined,
        body: hasBody ? await request.arrayBuffer() : undefined,
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
      { message: "The payout service is unavailable. Please try again." },
      { status: 503 },
    );
  }
}

export const GET = forward;
export const POST = forward;
export const DELETE = forward;
