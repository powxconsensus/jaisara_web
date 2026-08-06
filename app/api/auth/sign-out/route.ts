import { NextResponse, type NextRequest } from "next/server";
import {
  apiRequest,
  clearAuthCookies,
  currentRefreshToken,
  upstreamHeaders,
} from "@/lib/auth-server";

export async function POST(request: NextRequest) {
  const refreshToken = await currentRefreshToken();
  if (refreshToken) {
    try {
      await apiRequest("/auth/sign-out", {
        method: "POST",
        headers: upstreamHeaders(request),
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Local sign-out must still complete if the API is temporarily unavailable.
    }
  }

  const response = new NextResponse(null, { status: 204 });
  clearAuthCookies(response);
  return response;
}
