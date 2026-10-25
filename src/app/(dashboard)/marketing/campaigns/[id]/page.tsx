import type { Metadata } from "next";
import { requireActive } from "@/features/auth/actions/auth.action";
import { getCampaign, marketingScopeForUser } from "@/server/services/marketing.service";
import { CampaignDetail } from "@/features/marketing/components/campaign-detail";
export const metadata: Metadata = { title: "Campaign details | AnOps ERP" };
export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) { const session = await requireActive(); const campaign = await getCampaign(await marketingScopeForUser(session.user.email ?? ""), (await params).id); return <CampaignDetail initialCampaign={campaign} />; }
