import type { Metadata } from "next";
import { resolveWorkspace } from "@/server/tenancy/workspace";
import { listAIGenerations } from "@/server/services/ai-copy.service";
import { AICopywriter } from "@/features/marketing/components/ai-copywriter";

export const metadata: Metadata = { title: "AI Copywriter | Marketing & Socials | AnOps ERP" };

export default async function AICopywriterPage() {
  const ctx = await resolveWorkspace();
  const generations = await listAIGenerations(ctx);
  const history = generations.map((item) => ({
    _id: item.id,
    status: item.status,
    safeError: item.safeError,
  }));
  return <AICopywriter history={history} />;
}
