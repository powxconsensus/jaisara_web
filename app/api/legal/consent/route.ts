import { NextResponse, type NextRequest } from "next/server";
import {
  applySessionResult,
  authenticatedRequest,
  readUpstreamBody,
} from "@/lib/auth-server";

/** Whether this member has accepted the current privacy policy. */
export async function GET(request: NextRequest) {
  try {
    const result = await authenticatedRequest(request, "/legal/consent", { method: "GET" });
    const body = await readUpstreamBody(result.upstream);
    const response =
      body === null
        ? new NextResponse(null, { status: result.upstream.status })
        : NextResponse.json(body, { status: result.upstream.status });
    return applySessionResult(response, result);
  } catch {
    return NextResponse.json(
      { message: "We could not check your privacy settings. Please try again." },
      { status: 503 },
    );
  }
}

/**
 * Records the decision.
 *
 * Only `accepted` is forwarded. The version is the API's to decide - a client
 * that could name the version it was accepting could name one that was never
 * published, and the record would stop being evidence of what was agreed to.
 */
export async function POST(request: NextRequest) {
  let accepted: boolean;
  try {
    const payload = (await request.json()) as { accepted?: unknown };
    if (typeof payload.accepted !== "boolean") {
      return NextResponse.json({ message: "Choose whether to accept." }, { status: 400 });
    }
    accepted = payload.accepted;
  } catch {
    return NextResponse.json({ message: "Choose whether to accept." }, { status: 400 });
  }

  try {
    const result = await authenticatedRequest(request, "/legal/consent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accepted }),
    });
    const body = await readUpstreamBody(result.upstream);
    const response =
      body === null
        ? new NextResponse(null, { status: result.upstream.status })
        : NextResponse.json(body, { status: result.upstream.status });
    return applySessionResult(response, result);
  } catch {
    return NextResponse.json(
      { message: "We could not save that. Please try again." },
      { status: 503 },
    );
  }
}
