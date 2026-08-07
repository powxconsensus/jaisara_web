import type { Metadata } from "next";
import { ConfirmEmailChangeCard } from "@/components/auth/confirm-email-change-card";

export const metadata: Metadata = {
  title: "Confirm new email",
  robots: { index: false, follow: false },
};

export default async function ChangeEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const query = await searchParams;
  const token = typeof query.token === "string" ? query.token : undefined;
  return <ConfirmEmailChangeCard token={token} />;
}
