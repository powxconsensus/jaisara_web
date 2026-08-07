import { NextResponse, type NextRequest } from "next/server";
import {
  applySessionResult,
  authenticatedRequest,
  readUpstreamBody,
} from "@/lib/auth-server";

async function forwardAuthenticated(
  request: NextRequest,
  method: "POST" | "DELETE",
): Promise<NextResponse> {
  try {
    const result = await authenticatedRequest(request, "/auth/email-change", {
      method,
      ...(method === "POST"
        ? {
            headers: { "content-type": "application/json" },
            body: await request.text(),
          }
        : {}),
    });
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

export function POST(request: NextRequest) {
  return forwardAuthenticated(request, "POST");
}

export function DELETE(request: NextRequest) {
  return forwardAuthenticated(request, "DELETE");
}
