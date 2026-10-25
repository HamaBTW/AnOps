import type { Metadata } from "next";
import { requireActive } from "@/features/auth/actions/auth.action";
import { listAudiences, marketingScopeForUser } from "@/server/services/marketing.service";
import { AudiencesWorkspace } from "@/features/marketing/components/audiences-workspace";

export const metadata: Metadata = { title: "Audiences | Marketing & Socials | AnOps ERP" };
export default async function AudiencesPage() { const session = await requireActive(); const audiences = await listAudiences(await marketingScopeForUser(session.user.email ?? "")); return <AudiencesWorkspace initialAudiences={audiences} />; }
