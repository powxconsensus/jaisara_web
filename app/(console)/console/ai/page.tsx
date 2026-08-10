import type { Metadata } from "next";
import { AiConsole } from "@/components/console/ai/ai-console";

export const metadata: Metadata = { title: "AI providers" };

export default function ConsoleAiPage() {
  return <AiConsole />;
}
