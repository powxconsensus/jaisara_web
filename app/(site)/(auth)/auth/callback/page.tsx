import type { Metadata } from "next";
import { GoogleCallback } from "@/components/auth/google-callback";

export const metadata: Metadata = {
  title: "Completing Google sign-in",
  robots: { index: false, follow: false },
};

export default function GoogleCallbackPage() {
  return <GoogleCallback />;
}
