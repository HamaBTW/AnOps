import type { Metadata } from "next";
import { resolveWorkspace } from "@/server/tenancy/workspace";
import { listAudiences } from "@/server/services/marketing.service";
import { AudiencesWorkspace } from "@/features/marketing/components/audiences-workspace";

export const metadata: Metadata = { title: "Audiences | Marketing & Socials | AnOps ERP" };

export default async function AudiencesPage() {
  const ctx = await resolveWorkspace();
  const audiences = await listAudiences(ctx);
  return <AudiencesWorkspace initialAudiences={audiences} />;
}
