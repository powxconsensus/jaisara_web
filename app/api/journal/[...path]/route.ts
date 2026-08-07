import { NextResponse, type NextRequest } from "next/server";
import {
  applySessionResult,
  authenticatedRequest,
  readUpstreamBody,
} from "@/lib/auth-server";

async function forward(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await context.params;
    const suffix = path.map(encodeURIComponent).join("/");
    const method = request.method;
    const contentType = request.headers.get("content-type");
    const result = await authenticatedRequest(
      request,
      `/journal/${suffix}${request.nextUrl.search}`,
      {
        method,
        headers: contentType ? { "content-type": contentType } : undefined,
        // Bytes, not text — an image upload is multipart with its own boundary,
        // and decoding it to a string corrupts anything not valid UTF-8.
        body: ["GET", "HEAD"].includes(method) ? undefined : await request.arrayBuffer(),
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
      { message: "The journal service is unavailable. Please try again." },
      { status: 503 },
    );
  }
}

export const GET = forward;
export const POST = forward;
export const PATCH = forward;
