import type { Metadata } from "next";
import { CampaignStudio } from "@/components/console/campaigns/campaign-studio";

export const metadata: Metadata = { title: "Growth studio" };

export default function ConsoleCampaignsPage() {
  return <CampaignStudio />;
}
