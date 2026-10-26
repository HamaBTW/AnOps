import type { Metadata } from "next";
import { resolveWorkspace } from "@/server/tenancy/workspace";
import { getCampaign } from "@/server/services/marketing.service";
import { CampaignDetail } from "@/features/marketing/components/campaign-detail";

export const metadata: Metadata = { title: "Campaign details | AnOps ERP" };

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await resolveWorkspace();
  const campaign = await getCampaign(ctx, id);
  return <CampaignDetail initialCampaign={campaign} />;
}
