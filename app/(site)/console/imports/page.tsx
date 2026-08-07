import type { Metadata } from "next";
import { ImportConsole } from "@/components/console/imports/import-console";

export const metadata: Metadata = { title: "Imports" };

export default function ConsoleImportsPage() {
  return <ImportConsole />;
}
