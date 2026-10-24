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
