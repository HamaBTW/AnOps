import type { Metadata } from "next";
import { requireActive } from "@/features/auth/actions/auth.action";
import { listCampaigns, marketingScopeForUser } from "@/server/services/marketing.service";
import { CampaignsWorkspace } from "@/features/marketing/components/campaigns-workspace";
export const metadata: Metadata = { title: "Campaigns | Marketing & Socials | AnOps ERP" };
export default async function CampaignsPage() { const session = await requireActive(); return <CampaignsWorkspace initialCampaigns={await listCampaigns(await marketingScopeForUser(session.user.email ?? ""))} />; }
