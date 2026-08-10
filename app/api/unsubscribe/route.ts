import { NextResponse, type NextRequest } from "next/server";
import { apiRequest } from "@/lib/auth-server";

/**
 * Acts on an unsubscribe the member has just confirmed on `/unsubscribe`.
 *
 * Public and unauthenticated: the whole point of the token is that somebody
 * can leave the list without signing in, which is what a working opt-out
 * means. The token is the only credential, and the API is what validates it.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let token = "";
  try {
    const body = (await request.json()) as { token?: unknown };
    token = typeof body.token === "string" ? body.token.trim() : "";
  } catch {
    token = "";
  }

  if (token.length < 10) {
    return NextResponse.json({ message: "That unsubscribe link is not valid." }, { status: 400 });
  }

  try {
    const upstream = await apiRequest(
      `/unsubscribe?token=${encodeURIComponent(token)}`,
      { method: "POST" },
    );
    const payload: unknown = await upstream.json().catch(() => null);
    return NextResponse.json(payload ?? {}, { status: upstream.status });
  } catch {
    return NextResponse.json(
      { message: "We could not reach the mail service. Please try again." },
      { status: 503 },
    );
  }
}
