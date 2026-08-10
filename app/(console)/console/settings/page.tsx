import type { Metadata } from "next";
import { SettingsConsole } from "@/components/console/settings/settings-console";

export const metadata: Metadata = { title: "Splits & config" };

export default function ConsoleSettingsPage() {
  return <SettingsConsole />;
}
