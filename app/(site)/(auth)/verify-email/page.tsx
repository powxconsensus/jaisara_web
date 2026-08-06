import type { Metadata } from "next";
import { VerifyEmailCard } from "@/components/auth/verify-email-card";

export const metadata: Metadata = {
  title: "Verify email",
  robots: { index: false, follow: false },
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const query = await searchParams;
  const token = typeof query.token === "string" ? query.token : undefined;
  return <VerifyEmailCard token={token} />;
}
