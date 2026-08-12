import { NextResponse, type NextRequest } from "next/server";
import { authApiUrl } from "@/lib/auth-server";

export function GET(request: NextRequest) {
  const target = authApiUrl("/auth/google");
  const referralCode = request.nextUrl.searchParams.get("ref")?.trim();
  if (referralCode) target.searchParams.set("ref", referralCode);
  if (request.nextUrl.searchParams.get("newsletter") === "1") {
    target.searchParams.set("newsletter", "1");
  }
  return NextResponse.redirect(target);
}
