import { NextResponse, type NextRequest } from "next/server";
import {
  applySessionResult,
  authenticatedRequest,
  readUpstreamBody,
} from "@/lib/auth-server";

/** The member's username, and how many changes they have left. */
export async function GET(request: NextRequest) {
  return forward(request, "/auth/me/username", { method: "GET" });
}

/**
 * Sets or changes it.
 *
 * Kept off the generic `PATCH /auth/me` on purpose: a username change is
 * rationed and retires the old name permanently, which is not something to
 * carry as an extra field on a display-name save.
 */
export async function PATCH(request: NextRequest) {
  return forward(request, "/auth/me/username", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: await request.text(),
  });
}

async function forward(request: NextRequest, path: string, init: RequestInit) {
  try {
    const result = await authenticatedRequest(request, path, init);
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
