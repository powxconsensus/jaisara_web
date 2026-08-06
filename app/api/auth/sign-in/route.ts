import { NextResponse, type NextRequest } from "next/server";
import {
  apiRequest,
  isAuthResult,
  readUpstreamBody,
  setAuthCookies,
  upstreamHeaders,
} from "@/lib/auth-server";

export async function POST(request: NextRequest) {
  try {
    const upstream = await apiRequest("/auth/sign-in", {
      method: "POST",
      headers: upstreamHeaders(request),
      body: await request.text(),
    });
    const body = await readUpstreamBody(upstream);

    if (!upstream.ok || !isAuthResult(body)) {
      return NextResponse.json(body, { status: upstream.status });
    }

    const response = NextResponse.json({
      user: body.user,
      deletionCancelled: body.deletionCancelled,
      verificationEmailSent: body.verificationEmailSent,
      verificationExpiresAt: body.verificationExpiresAt,
    });
    setAuthCookies(response, body);
    return response;
  } catch {
    return NextResponse.json(
      { message: "The authentication service is unavailable. Please try again." },
      { status: 503 },
    );
  }
}
