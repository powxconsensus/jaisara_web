import { NextResponse, type NextRequest } from "next/server";
import { authApiUrl } from "@/lib/auth-server";

export function GET(request: NextRequest) {
  const target = authApiUrl("/auth/google");
  const referralCode = request.nextUrl.searchParams.get("ref")?.trim();
  if (referralCode) target.searchParams.set("ref", referralCode);
  return NextResponse.redirect(target);
}
