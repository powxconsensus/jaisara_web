import type { Metadata } from "next";
import { PRIVACY } from "@/lib/data/legal";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return <LegalPage document={PRIVACY} />;
}
