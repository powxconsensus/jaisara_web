import type { Metadata } from "next";
import { ClaimQueue } from "@/components/console/claims/claim-queue";

export const metadata: Metadata = { title: "Claims" };

export default async function ConsoleClaimsPage({
  searchParams,
}: PageProps<"/console/claims">) {
  const { status } = await searchParams;
  return <ClaimQueue initialStatus={typeof status === "string" ? status : undefined} />;
}
