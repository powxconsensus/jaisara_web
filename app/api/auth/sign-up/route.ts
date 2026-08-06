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
    const upstream = await apiRequest("/auth/sign-up", {
      method: "POST",
      headers: upstreamHeaders(request),
      body: await request.text(),
    });
    const body = await readUpstreamBody(upstream);

    if (!upstream.ok) {
      return NextResponse.json(body, { status: upstream.status });
    }

    if (isAuthResult(body)) {
      const created = body as typeof body & {
        verificationEmailSent?: boolean;
        verificationExpiresAt?: string;
      };
      const response = NextResponse.json({
        status: "verification_pending",
        email: body.user.email,
        verificationEmailSent: created.verificationEmailSent ?? true,
        verificationExpiresAt: created.verificationExpiresAt,
      });
      setAuthCookies(response, body);
      return response;
    }

    return NextResponse.json(body, { status: upstream.status });
  } catch {
    return NextResponse.json(
      { message: "The authentication service is unavailable. Please try again." },
      { status: 503 },
    );
  }
}
