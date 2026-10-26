import type { Metadata } from "next";
import { resolveWorkspace } from "@/server/tenancy/workspace";
import { listTemplates } from "@/server/services/marketing.service";
import { TemplatesWorkspace } from "@/features/marketing/components/templates-workspace";

export const metadata: Metadata = { title: "Templates | Marketing & Socials | AnOps ERP" };

export default async function TemplatesPage() {
  const ctx = await resolveWorkspace();
  const templates = await listTemplates(ctx);
  return <TemplatesWorkspace initialTemplates={templates} />;
}
