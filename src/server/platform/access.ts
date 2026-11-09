import "server-only";
import { randomUUID } from "crypto";
import { ObjectId, type Db } from "mongodb";
import { redirect } from "next/navigation";
import { getEntitlements } from "@/server/platform/subscription.service";
import { getPageWorkspace, resolveWorkspace, isEmailTrusted, type WorkspaceContext } from "@/server/tenancy/workspace";
import { auth } from "@/server/auth";
import clientPromise from "@/server/db/client";
import { ensureIndexes } from "@/server/db/indexes";
import { permissionsForRole, workspaceRoleFor } from "@/server/security/permissions";
import { APPLICATION_IDS, isApplicationId, type ApplicationId } from "@/shared/domain/applications";
import { effectiveApps, type Entitlements } from "@/shared/domain/plans";
import type { CompanyRole } from "@/features/company/types";
import { AppError, isAppError } from "@/shared/lib/errors";

export type MemberAccess = {
  memberId: ObjectId;
  companyRole: CompanyRole;
  /** null = every application the organization is entitled to. */
  appAccess: ApplicationId[] | null;
};

export type OrgAccess = {
  ctx: WorkspaceContext;
  companyRole: CompanyRole;
  member: MemberAccess;
  entitlements: Entitlements;
  /** Applications this person may open right now (organization entitlement ∩ member access). */
  apps: ApplicationId[];
  organization: { id: string; name: string; activationStatus: "pending" | "active"; activationDeadline: string | null; currency: string };
};

async function loadMember(db: Db, companyId: ObjectId, userId: ObjectId): Promise<MemberAccess | null> {
  const doc = await db.collection("company_members").findOne({ companyId, userId, status: "active" });
  if (!doc) return null;
  const appAccess = Array.isArray(doc.appAccess) ? (doc.appAccess as unknown[]).filter(isApplicationId) : null;
  return { memberId: doc._id as ObjectId, companyRole: doc.role as CompanyRole, appAccess };
}

async function build(ctx: WorkspaceContext): Promise<OrgAccess> {
  const [member, entitlements, company] = await Promise.all([
    loadMember(ctx.db, ctx.companyId, ctx.userId),
    getEntitlements(ctx.db, ctx.companyId),
    ctx.db.collection("companies").findOne({ _id: ctx.companyId }, { projection: { name: 1, activationStatus: 1, activationDeadline: 1, currency: 1 } }),
  ]);
  if (!member || !company) throw new AppError("NO_COMPANY", "Create or join a company to continue.");
  return {
    ctx,
    companyRole: member.companyRole,
    member,
    entitlements,
    apps: effectiveApps(entitlements, member),
    organization: {
      id: ctx.companyId.toHexString(),
      name: String(company.name ?? ""),
      activationStatus: company.activationStatus === "pending" ? "pending" : "active",
      activationDeadline: company.activationDeadline instanceof Date ? company.activationDeadline.toISOString() : null,
      currency: String(company.currency ?? "TND"),
    },
  };
}

/** Active-company access for pages (redirects like getPageWorkspace). */
export async function getPageOrgAccess(): Promise<OrgAccess> {
  return build(await getPageWorkspace());
}

export async function resolveOrgAccess(requestId: string = randomUUID()): Promise<OrgAccess> {
  return build(await resolveWorkspace(requestId));
}

/**
 * The entitlement-aware route guard used by every application layout. Unauthorized applications
 * redirect to the home screen (which never redirects on entitlements, so there is no loop).
 */
export async function requireAppAccess(appId: ApplicationId): Promise<OrgAccess> {
  const access = await getPageOrgAccess();
  if (!access.apps.includes(appId)) {
    redirect(`/anops?locked=${encodeURIComponent(appId)}`);
  }
  return access;
}

/**
 * Guard for pages that are AI features (e.g. Marketing AI copy, HR AI activity). Organizations whose plan has no
 * AI features are sent to the application's home; the AI services refuse the calls independently.
 */
export async function requireAiFeatures(appHome: string): Promise<OrgAccess> {
  const access = await getPageOrgAccess();
  if (!access.entitlements.aiFeatures) redirect(appHome);
  return access;
}

/** Throws FORBIDDEN when the application is not available (for server actions and route handlers). */
export function assertAppAccess(access: OrgAccess, appId: ApplicationId): void {
  if (!access.apps.includes(appId)) throw new AppError("FORBIDDEN", "This application is not included in your organization's plan or your access.");
}

/**
 * Context for `/organization/[orgId]` pages and actions. The organization comes from the URL, so
 * membership is verified here: a user can only ever act on organizations they belong to (no IDOR).
 */
export async function resolveOrganizationById(orgId: string, requestId: string = randomUUID()): Promise<OrgAccess> {
  const session = await auth();
  const rawUserId = session?.user?.id;
  if (!rawUserId || !ObjectId.isValid(rawUserId)) throw new AppError("UNAUTHENTICATED", "Please sign in to continue.");
  if (!ObjectId.isValid(orgId)) throw new AppError("NOT_FOUND", "Organization not found.");
  const db = (await clientPromise).db();
  await ensureIndexes(db);
  const userId = new ObjectId(rawUserId);
  const user = await db.collection("users").findOne({ _id: userId }, { projection: { status: 1, emailVerified: 1, provisionalUntil: 1 } });
  if (!user || user.status === "banned" || user.status === "unverified" || !isEmailTrusted(user)) {
    throw new AppError("UNAUTHENTICATED", "Please sign in to continue.");
  }
  const companyId = new ObjectId(orgId);
  const company = await db.collection("companies").findOne({ _id: companyId }, { projection: { currency: 1, activationStatus: 1, activationDeadline: 1 } });
  const visible =
    company &&
    company.activationStatus !== "expiring" &&
    (company.activationStatus !== "pending" || (company.activationDeadline instanceof Date && company.activationDeadline > new Date()));
  const member = visible ? await loadMember(db, companyId, userId) : null;
  // Same answer for "does not exist" and "not yours".
  if (!member) throw new AppError("NOT_FOUND", "Organization not found.");
  const role = workspaceRoleFor(member.companyRole);
  return build({ db, requestId, userId, companyId, role, currencyCode: String(company?.currency ?? "TND"), permissions: permissionsForRole(role) });
}

export async function getPageOrganization(orgId: string): Promise<OrgAccess> {
  try {
    return await resolveOrganizationById(orgId);
  } catch (error) {
    if (isAppError(error) && error.code === "UNAUTHENTICATED") redirect(`/login?callbackUrl=/organization/${encodeURIComponent(orgId)}`);
    if (isAppError(error) && error.code === "NOT_FOUND") redirect("/anops");
    throw error;
  }
}

export function isOrgManager(access: OrgAccess): boolean {
  return access.companyRole === "owner" || access.companyRole === "admin";
}

export const ALL_APPS = APPLICATION_IDS;
