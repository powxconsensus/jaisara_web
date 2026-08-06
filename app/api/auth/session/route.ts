import { NextResponse, type NextRequest } from "next/server";
import {
  apiRequest,
  setAuthCookies,
  upstreamHeaders,
} from "@/lib/auth-server";
import type { TokenPair } from "@/lib/auth-types";

export async function POST(request: NextRequest) {
  let input: Partial<TokenPair>;
  try {
    input = (await request.json()) as Partial<TokenPair>;
  } catch {
    return NextResponse.json({ message: "Invalid Google sign-in response" }, { status: 400 });
  }

  if (
    typeof input.accessToken !== "string" ||
    typeof input.refreshToken !== "string" ||
    typeof input.expiresIn !== "string" ||
    typeof input.refreshExpiresIn !== "string"
  ) {
    return NextResponse.json({ message: "Incomplete Google sign-in response" }, { status: 400 });
  }

  try {
    const upstream = await apiRequest("/auth/me", {
      headers: new Headers({
        ...Object.fromEntries(upstreamHeaders(request, false)),
        authorization: `Bearer ${input.accessToken}`,
      }),
    });

    if (!upstream.ok) {
      return NextResponse.json({ message: "Google sign-in could not be verified" }, { status: 401 });
    }

    const user = await upstream.json();
    const response = NextResponse.json({ user });
    setAuthCookies(response, input as TokenPair);
    return response;
  } catch {
    return NextResponse.json(
      { message: "The authentication service is unavailable. Please try again." },
      { status: 503 },
    );
  }
}
