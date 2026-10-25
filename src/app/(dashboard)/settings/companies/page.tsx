import type { Metadata } from "next";
import { requireActive } from "@/features/auth/actions/auth.action";
import { ensureLegacyCompany, listMyCompanies } from "@/server/authz/company";
import { CompaniesWorkspace } from "@/features/settings/components/companies-workspace";

export const metadata: Metadata = { title: "Companies | AnOps" };
export default async function CompaniesPage() { const session = await requireActive(); await ensureLegacyCompany(session.user.id, session.user.email ?? ""); return <CompaniesWorkspace initialCompanies={await listMyCompanies(session.user.id)} />; }
