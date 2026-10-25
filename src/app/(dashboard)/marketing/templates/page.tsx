import type { Metadata } from "next";
import { requireActive } from "@/features/auth/actions/auth.action";
import { listTemplates, marketingScopeForUser } from "@/server/services/marketing.service";
import { TemplatesWorkspace } from "@/features/marketing/components/templates-workspace";
export const metadata: Metadata = { title: "Templates | Marketing & Socials | AnOps ERP" };
export default async function TemplatesPage() { const session = await requireActive(); return <TemplatesWorkspace initialTemplates={await listTemplates(await marketingScopeForUser(session.user.email ?? ""))} />; }
