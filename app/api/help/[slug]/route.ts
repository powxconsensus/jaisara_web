import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/auth-server";

/** One published help article. Public, for the same reason the index is. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await context.params;

  try {
    const upstream = await apiRequest(`/journal/help/${encodeURIComponent(slug)}`);
    const body: unknown = await upstream.json().catch(() => null);
    return NextResponse.json(body ?? { message: "No such article" }, { status: upstream.status });
  } catch {
    return NextResponse.json(
      { message: "The help centre is unavailable. Please try again." },
      { status: 503 },
    );
  }
}
