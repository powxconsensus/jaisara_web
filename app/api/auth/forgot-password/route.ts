import type { NextRequest } from "next/server";
import { forwardPublicJson } from "@/lib/auth-server";

export function POST(request: NextRequest) {
  return forwardPublicJson(request, "/auth/forgot-password");
}
