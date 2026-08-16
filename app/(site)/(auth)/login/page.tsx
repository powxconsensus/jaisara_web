import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Log in",
  description: "Sign in to your Jaisara wallet.",
};

/**
 * What to say when a Google sign-in came back here instead of the dashboard.
 *
 * The OAuth callback is a server route now, so a failure has nowhere to render
 * its own message - it redirects here with a reason. Without this the member
 * would land on a blank sign-in form having just been told nothing at all,
 * which reads as the click having silently done nothing.
 *
 * Mapped rather than passed through: the reason is in a URL anybody can edit,
 * so it selects from fixed copy instead of being displayed.
 */
const OAUTH_ERRORS: Record<string, string> = {
  google_failed: "Google sign-in could not be completed. Please try again.",
  google_incomplete: "Google did not return a complete sign-in response.",
  service_unavailable: "The authentication service is unavailable. Please try again.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  const notice = typeof error === "string" ? OAUTH_ERRORS[error] : undefined;

  return <AuthForm mode="login" notice={notice} />;
}
