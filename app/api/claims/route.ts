import { NextResponse, type NextRequest } from "next/server";
import {
  applySessionResult,
  authenticatedRequest,
  readUpstreamBody,
} from "@/lib/auth-server";

/** Submit a claim, or list your own. */
async function forward(request: NextRequest) {
  try {
    const method = request.method;
    const result = await authenticatedRequest(request, `/claims${request.nextUrl.search}`, {
      method,
      headers: { "content-type": "application/json" },
      body: method === "GET" ? undefined : await request.arrayBuffer(),
    });

    const body = await readUpstreamBody(result.upstream);
    const response =
      body === null
        ? new NextResponse(null, { status: result.upstream.status })
        : NextResponse.json(body, { status: result.upstream.status });
    return applySessionResult(response, result);
  } catch {
    return NextResponse.json(
      { message: "The claims service is unavailable. Please try again." },
      { status: 503 },
    );
  }
}

export const GET = forward;
export const POST = forward;
