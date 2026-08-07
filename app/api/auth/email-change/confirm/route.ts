import { NextResponse, type NextRequest } from "next/server";
import {
  apiRequest,
  clearAuthCookies,
  responseFromUpstream,
  upstreamHeaders,
} from "@/lib/auth-server";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const upstream = await apiRequest("/auth/email-change/confirm", {
      method: "POST",
      headers: upstreamHeaders(request),
      body: await request.text(),
    });
    const response = await responseFromUpstream(upstream);
    if (upstream.ok) clearAuthCookies(response);
    return response;
  } catch {
    return NextResponse.json(
      { message: "The authentication service is unavailable. Please try again." },
      { status: 503 },
    );
  }
}
