import { NextResponse, type NextRequest } from "next/server";
import {
  applySessionResult,
  authenticatedRequest,
  readUpstreamBody,
} from "@/lib/auth-server";

/** Whether you have already registered interest, and how many others have. */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ feature: string }> },
): Promise<NextResponse> {
  try {
    const { feature } = await context.params;
    const result = await authenticatedRequest(
      request,
      `/feature-interest/${encodeURIComponent(feature)}`,
    );

    const body = await readUpstreamBody(result.upstream);
    const response =
      body === null
        ? new NextResponse(null, { status: result.upstream.status })
        : NextResponse.json(body, { status: result.upstream.status });
    return applySessionResult(response, result);
  } catch {
    return NextResponse.json({ message: "That could not be loaded." }, { status: 503 });
  }
}
