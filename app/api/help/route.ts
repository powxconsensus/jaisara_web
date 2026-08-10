import { NextResponse, type NextRequest } from "next/server";
import { apiRequest } from "@/lib/auth-server";

/**
 * The help centre index.
 *
 * Public and unauthenticated on purpose: a help article is the one thing in
 * the widget somebody should be able to read *before* signing in, which is
 * usually when they are stuck enough to need it.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const search = request.nextUrl.searchParams.get("search")?.slice(0, 120) ?? "";

  try {
    const upstream = await apiRequest(
      `/journal/help${search ? `?search=${encodeURIComponent(search)}` : ""}`,
    );
    const body: unknown = await upstream.json().catch(() => []);
    return NextResponse.json(body, { status: upstream.status });
  } catch {
    return NextResponse.json(
      { message: "The help centre is unavailable. Please try again." },
      { status: 503 },
    );
  }
}
