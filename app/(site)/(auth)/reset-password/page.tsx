import type { Metadata } from "next";
import { ResetPasswordCard } from "@/components/auth/reset-password-card";

export const metadata: Metadata = {
  title: "Reset password",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const query = await searchParams;
  const token = typeof query.token === "string" ? query.token : undefined;
  return <ResetPasswordCard token={token} />;
}
