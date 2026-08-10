import type { Metadata } from "next";
import { JournalStudio } from "@/components/console/journal/journal-studio";

export const metadata: Metadata = { title: "Journal" };

export default function ConsoleJournalPage() {
  return <JournalStudio />;
}
