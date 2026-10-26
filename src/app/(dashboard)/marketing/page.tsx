import type { Metadata } from "next";
import { resolveWorkspace } from "@/server/tenancy/workspace";
import { getMarketingAnalytics } from "@/server/services/marketing-analytics.service";
import { listCampaigns } from "@/server/services/marketing.service";
import { listSocialPosts } from "@/server/services/social.service";
import { MarketingDashboard } from "@/features/marketing/components/marketing-dashboard";

export const metadata: Metadata = {
  title: "Marketing & Socials | AnOps ERP",
  description: "Plan campaigns, manage leads, and coordinate social content from AnOps.",
};

export default async function MarketingPage() {
  const ctx = await resolveWorkspace();
  const [analytics, campaigns, posts] = await Promise.all([
    getMarketingAnalytics(ctx),
    listCampaigns(ctx),
    listSocialPosts(ctx),
  ]);

  return (
    <MarketingDashboard
      initialAnalytics={analytics}
      initialCampaigns={campaigns}
      initialPosts={posts}
    />
  );
}
