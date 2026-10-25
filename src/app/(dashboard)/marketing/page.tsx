import type { Metadata } from "next";
import { MarketingDashboard } from "@/features/marketing/components/marketing-dashboard";

export const metadata: Metadata = {
  title: "Marketing & Socials | AnOps ERP",
  description: "Plan campaigns, manage leads, and coordinate social content from AnOps.",
};

export default function MarketingPage() {
  return <MarketingDashboard />;
}
