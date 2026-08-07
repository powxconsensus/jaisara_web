import type { Metadata } from "next";
import { SupportQueue } from "@/components/console/support/support-queue";

export const metadata: Metadata = { title: "Support" };

export default function ConsoleSupportPage() {
  return <SupportQueue />;
}
