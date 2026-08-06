import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Free forever, no card. Withdraw your cashback from $20.",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string | string[] }>;
}) {
  const query = await searchParams;
  const referral = typeof query.ref === "string" ? query.ref.trim().toUpperCase() : "";
  return <AuthForm mode="signup" initialReferral={referral} />;
}
