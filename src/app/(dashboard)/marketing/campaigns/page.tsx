import type { Metadata } from "next";
import { resolveWorkspace } from "@/server/tenancy/workspace";
import { listCampaigns } from "@/server/services/marketing.service";
import { CampaignsWorkspace } from "@/features/marketing/components/campaigns-workspace";

export const metadata: Metadata = { title: "Campaigns | Marketing & Socials | AnOps ERP" };

export default async function CampaignsPage() {
  const ctx = await resolveWorkspace();
  const campaigns = await listCampaigns(ctx);
  return <CampaignsWorkspace initialCampaigns={campaigns} />;
}
