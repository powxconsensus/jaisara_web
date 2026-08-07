import type { Metadata } from "next";
import { CampaignStudio } from "@/components/console/campaigns/campaign-studio";

export const metadata: Metadata = { title: "Email studio" };

export default function ConsoleCampaignsPage() {
  return <CampaignStudio />;
}
