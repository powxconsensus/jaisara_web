import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Log in",
  description: "Sign in to your Jaisara wallet.",
};

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
