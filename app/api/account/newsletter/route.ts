import { NextResponse, type NextRequest } from "next/server";
import {
  applySessionResult,
  authenticatedRequest,
  readUpstreamBody,
} from "@/lib/auth-server";

export async function GET(request: NextRequest) {
  return forward(request, { method: "GET" });
}

export async function PATCH(request: NextRequest) {
  return forward(request, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: await request.text(),
  });
}

async function forward(request: NextRequest, init: RequestInit) {
  try {
    const result = await authenticatedRequest(request, "/me/newsletter", init);
    const body = await readUpstreamBody(result.upstream);
    const response =
      body === null
        ? new NextResponse(null, { status: result.upstream.status })
        : NextResponse.json(body, { status: result.upstream.status });
    return applySessionResult(response, result);
  } catch {
    return NextResponse.json(
      { message: "Newsletter settings are unavailable. Please try again." },
      { status: 503 },
    );
  }
}
