import type { Metadata } from "next";
import { TERMS } from "@/lib/data/legal";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Terms & conditions" };

export default function TermsPage() {
  return <LegalPage document={TERMS} />;
}
