import { NextResponse, type NextRequest } from "next/server";
import {
  applySessionResult,
  authenticatedRequest,
  readUpstreamBody,
} from "@/lib/auth-server";

/** Registers interest in a feature that does not exist yet. */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const result = await authenticatedRequest(request, "/feature-interest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: await request.text(),
    });

    const body = await readUpstreamBody(result.upstream);
    const response =
      body === null
        ? new NextResponse(null, { status: result.upstream.status })
        : NextResponse.json(body, { status: result.upstream.status });
    return applySessionResult(response, result);
  } catch {
    return NextResponse.json({ message: "That could not be saved. Try again." }, { status: 503 });
  }
}
