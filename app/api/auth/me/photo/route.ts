import { NextResponse, type NextRequest } from "next/server";
import {
  applySessionResult,
  authenticatedRequest,
  readUpstreamBody,
} from "@/lib/auth-server";

/**
 * Uploads the signed-in member's profile photo.
 *
 * The body is forwarded as bytes, not text: this is multipart with its own
 * boundary, and decoding it to a string corrupts anything that is not valid
 * UTF-8 - which is all of a PNG.
 */
export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type");

  return forward(request, {
    method: "POST",
    headers: contentType ? { "content-type": contentType } : undefined,
    body: await request.arrayBuffer(),
  });
}

export async function DELETE(request: NextRequest) {
  return forward(request, { method: "DELETE" });
}

async function forward(request: NextRequest, init: RequestInit) {
  try {
    const result = await authenticatedRequest(request, "/auth/me/photo", init);
    const body = await readUpstreamBody(result.upstream);
    const response =
      body === null
        ? new NextResponse(null, { status: result.upstream.status })
        : NextResponse.json(body, { status: result.upstream.status });
    return applySessionResult(response, result);
  } catch {
    return NextResponse.json(
      { message: "The account service is unavailable. Please try again." },
      { status: 503 },
    );
  }
}
