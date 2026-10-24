import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentAuthUser } from "@/server/auth/rbac";
import { getActiveTenant } from "@/server/tenant/context";
import {
  getCompanyById,
  getCompanyMembers,
  getUserCompanies,
  getCompanyStats,
} from "@/server/services/company.service";
import { CompanyManagementClient } from "@/features/company/components";

export const metadata: Metadata = {
  title: "Company & Organization Management | AnOps ERP",
  description: "Manage organization details, team members, roles, and multi-tenant settings.",
};

export default async function CompanyManagementPage() {
  const authUser = await getCurrentAuthUser();
  if (!authUser) {
    redirect("/login");
  }

  const tenant = await getActiveTenant();
  if (!tenant) {
    redirect("/onboarding");
  }

  const [company, members, userCompanies, stats] = await Promise.all([
    getCompanyById(tenant.companyId),
    getCompanyMembers(tenant.companyId),
    getUserCompanies(authUser.userId),
    getCompanyStats(tenant.companyId),
  ]);

  if (!company) {
    redirect("/onboarding");
  }

  return (
    <CompanyManagementClient
      currentCompany={company}
      userRole={tenant.role}
      currentUserId={authUser.userId}
      initialMembers={members}
      userCompanies={userCompanies}
      stats={stats}
    />
  );
}
