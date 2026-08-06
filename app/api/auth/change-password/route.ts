import { NextResponse, type NextRequest } from "next/server";
import {
  applySessionResult,
  authenticatedRequest,
  clearAuthCookies,
  readUpstreamBody,
} from "@/lib/auth-server";

export async function POST(request: NextRequest) {
  try {
    const result = await authenticatedRequest(request, "/auth/change-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: await request.text(),
    });
    const body = await readUpstreamBody(result.upstream);
    const response =
      body === null
        ? new NextResponse(null, { status: result.upstream.status })
        : NextResponse.json(body, { status: result.upstream.status });

    if (result.upstream.ok) {
      clearAuthCookies(response);
      return response;
    }
    return applySessionResult(response, result);
  } catch {
    return NextResponse.json(
      { message: "The authentication service is unavailable. Please try again." },
      { status: 503 },
    );
  }
}
