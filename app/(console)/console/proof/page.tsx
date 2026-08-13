import type { Metadata } from "next";
import { HomepageProofEditor } from "@/components/console/campaigns/homepage-proof-editor";
import { PageHeader } from "@/components/console/ui";

export const metadata: Metadata = { title: "Homepage proof" };

/**
 * Its own section rather than a tab inside the email studio.
 *
 * Sponsors and sourced feedback are the only thing in Growth that never
 * becomes an email — they are page content. Filing them behind a studio whose
 * other three tabs are all about sending mail meant the one non-email job was
 * the hardest to find.
 */
export default function ConsoleProofPage() {
  return (
    <>
      <PageHeader
        eyebrow="GROWTH"
        title="Homepage proof"
        description="Sponsor logos and the member feedback shown on the homepage."
      />
      <HomepageProofEditor />
    </>
  );
}
