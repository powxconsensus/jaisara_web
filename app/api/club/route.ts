import { NextResponse, type NextRequest } from "next/server";
import {
  applySessionResult,
  authenticatedRequest,
  readUpstreamBody,
} from "@/lib/auth-server";

/** The signed-in member's club standing and invite link. */
export async function GET(request: NextRequest) {
  try {
    const result = await authenticatedRequest(request, "/club", { method: "GET" });
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
