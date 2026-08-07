import type { Metadata } from "next";
import { ClubView } from "@/components/dashboard/club-view";

export const metadata: Metadata = { title: "Jaisara Club" };

export default function ClubPage() {
  return <ClubView />;
}
