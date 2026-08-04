import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Free forever, no card. Withdraw your cashback from $20.",
};

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
