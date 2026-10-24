"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { auth } from "@/server/auth";
import { createCompanySchema } from "@/features/company/schemas/company.schema";
import {
  createCompany,
  getUserCompanies,
  getCompanyMember,
} from "@/server/services/company.service";
import { ACTIVE_COMPANY_COOKIE } from "@/server/tenant/context";
import type { Company } from "@/features/company/types";

export type CompanyActionResult<T = unknown> = {
  success?: boolean;
  data?: T;
  error?: string;
};

export async function createCompanyAction(rawData: unknown): Promise<CompanyActionResult<Company>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "You must be signed in to create a company." };
    }

    const parsed = createCompanySchema.safeParse(rawData);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message || "Invalid company details.";
      return { error: firstIssue };
    }

    const company = await createCompany(session.user.id, parsed.data);

    // Set as active company in cookie
    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_COMPANY_COOKIE, company.id, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    revalidatePath("/", "layout");
    return { success: true, data: company };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create company.";
    return { error: message };
  }
}

export async function switchCompanyAction(companyId: string): Promise<CompanyActionResult<boolean>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "You must be signed in." };
    }

    const member = await getCompanyMember(companyId, session.user.id);
    if (!member) {
      return { error: "Forbidden: You are not a member of this company." };
    }

    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_COMPANY_COOKIE, companyId, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });

    revalidatePath("/", "layout");
    return { success: true, data: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to switch company.";
    return { error: message };
  }
}

export async function getUserCompaniesAction(): Promise<
  CompanyActionResult<{ companies: Company[]; activeCompanyId?: string }>
> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized." };
    }

    const companies = await getUserCompanies(session.user.id);
    const cookieStore = await cookies();
    const activeCompanyId = cookieStore.get(ACTIVE_COMPANY_COOKIE)?.value || companies[0]?.id;

    return { success: true, data: { companies, activeCompanyId } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load user companies.";
    return { error: message };
  }
}

export async function updateCompanyAction(
  companyId: string,
  rawData: unknown
): Promise<CompanyActionResult<Company>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized." };
    }

    const member = await getCompanyMember(companyId, session.user.id);
    if (!member || (member.role !== "owner" && member.role !== "admin")) {
      return { error: "Forbidden: Only organization owners or admins can update company settings." };
    }

    const { updateCompanySchema } = await import("@/features/company/schemas/company.schema");
    const parsed = updateCompanySchema.safeParse(rawData);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid update data." };
    }

    const { updateCompany } = await import("@/server/services/company.service");
    const updated = await updateCompany(companyId, parsed.data);
    revalidatePath("/company");
    revalidatePath("/", "layout");
    return { success: true, data: updated };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update company settings.";
    return { error: message };
  }
}

export async function getCompanyMembersAction(
  companyId?: string
): Promise<CompanyActionResult<import("@/features/company/types").CompanyMember[]>> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized." };

    const { getActiveTenant } = await import("@/server/tenant/context");
    const tenant = await getActiveTenant();
    const targetCompanyId = companyId || tenant?.companyId;
    if (!targetCompanyId) return { error: "No active company selected." };

    const member = await getCompanyMember(targetCompanyId, session.user.id);
    if (!member) return { error: "Forbidden: You are not a member of this company." };

    const { getCompanyMembers } = await import("@/server/services/company.service");
    const members = await getCompanyMembers(targetCompanyId);
    return { success: true, data: members };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load company members.";
    return { error: message };
  }
}

export async function addCompanyMemberAction(
  companyId: string,
  rawData: unknown
): Promise<
  CompanyActionResult<{
    member: import("@/features/company/types").CompanyMember;
    tempPassword?: string;
  }>
> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized." };

    const currentMember = await getCompanyMember(companyId, session.user.id);
    if (!currentMember || (currentMember.role !== "owner" && currentMember.role !== "admin")) {
      return { error: "Forbidden: Only owners and admins can add team members." };
    }

    const { addCompanyMemberSchema } = await import("@/features/company/schemas/company.schema");
    const parsed = addCompanyMemberSchema.safeParse(rawData);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid member data." };
    }

    const { addCompanyMember } = await import("@/server/services/company.service");
    const result = await addCompanyMember(
      companyId,
      parsed.data.email,
      parsed.data.role,
      parsed.data.fullName
    );

    revalidatePath("/company");
    return { success: true, data: result };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to add company member.";
    return { error: message };
  }
}

export async function updateCompanyMemberRoleAction(
  companyId: string,
  memberId: string,
  rawData: unknown
): Promise<CompanyActionResult<import("@/features/company/types").CompanyMember>> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized." };

    const currentMember = await getCompanyMember(companyId, session.user.id);
    if (!currentMember || (currentMember.role !== "owner" && currentMember.role !== "admin")) {
      return { error: "Forbidden: Only owners and admins can update member roles." };
    }

    const { updateCompanyMemberRoleSchema } = await import("@/features/company/schemas/company.schema");
    const parsed = updateCompanyMemberRoleSchema.safeParse(rawData);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid role." };
    }

    const { updateCompanyMemberRole } = await import("@/server/services/company.service");
    const updated = await updateCompanyMemberRole(
      companyId,
      memberId,
      parsed.data.role,
      session.user.id
    );

    revalidatePath("/company");
    return { success: true, data: updated };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update member role.";
    return { error: message };
  }
}

export async function removeCompanyMemberAction(
  companyId: string,
  memberId: string
): Promise<CompanyActionResult<boolean>> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized." };

    const currentMember = await getCompanyMember(companyId, session.user.id);
    if (!currentMember || (currentMember.role !== "owner" && currentMember.role !== "admin")) {
      return { error: "Forbidden: Only owners and admins can remove team members." };
    }

    const { removeCompanyMember } = await import("@/server/services/company.service");
    await removeCompanyMember(companyId, memberId, session.user.id);

    revalidatePath("/company");
    return { success: true, data: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to remove member.";
    return { error: message };
  }
}

export async function getCompanyStatsAction(
  companyId?: string
): Promise<CompanyActionResult<{ membersCount: number; employeesCount: number; departmentsCount: number; jobTitlesCount: number }>> {
  try {
    const { getActiveTenant } = await import("@/server/tenant/context");
    const tenant = await getActiveTenant();
    const targetId = companyId || tenant?.companyId;
    if (!targetId) return { error: "No active company." };

    const { getCompanyStats } = await import("@/server/services/company.service");
    const stats = await getCompanyStats(targetId);
    return { success: true, data: stats };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load company stats.";
    return { error: message };
  }
}
