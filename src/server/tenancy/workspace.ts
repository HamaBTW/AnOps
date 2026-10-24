import "server-only";
import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { ObjectId, type Db } from "mongodb";
import { auth } from "@/server/auth";
import clientPromise from "@/server/db/client";
import { ensureIndexes } from "@/server/db/indexes";
import {
  COLLECTIONS,
  type CompanyDoc,
  type MembershipDoc,
  type OrganizationDoc,
} from "@/server/db/documents";
import { assertPermission, permissionsForRole, type Permission } from "@/server/security/permissions";
import { AppError, isAppError } from "@/shared/lib/errors";

/** Default currency for personal workspaces. Company settings UI is not implemented yet. */
export const DEFAULT_CURRENCY = "TND";
export const DEFAULT_TIMEZONE = "Africa/Tunis";

/**
 * Trusted, server-resolved tenant context. Built only from the verified session and
 * stored membership. Nothing in it is taken from a request body or URL.
 */
export type WorkspaceContext = {
  db: Db;
  requestId: string;
  userId: ObjectId;
  organizationId: ObjectId;
  companyId: ObjectId;
  role: MembershipDoc["role"];
  currencyCode: string;
  permissions: ReadonlySet<Permission>;
};

/** Resolves the caller's active workspace. Throws AppError(UNAUTHENTICATED) when there is no valid session. */
export async function resolveWorkspace(requestId: string = randomUUID()): Promise<WorkspaceContext> {
  const session = await auth();
  const rawUserId = session?.user?.id;
  if (!rawUserId || !ObjectId.isValid(rawUserId)) {
    throw new AppError("UNAUTHENTICATED", "Please sign in to continue.");
  }

  const db = (await clientPromise).db();
  await ensureIndexes(db);

  const userId = new ObjectId(rawUserId);
  // Re-check the live account state: a ban or lock must take effect before the JWT expires.
  const user = await db
    .collection("users")
    .findOne({ _id: userId }, { projection: { status: 1, emailVerified: 1, name: 1 } });
  if (!user || user.status === "banned" || user.status === "unverified" || !user.emailVerified) {
    throw new AppError("UNAUTHENTICATED", "Please sign in to continue.");
  }

  let membership = await findActiveMembership(db, userId);
  if (!membership) {
    membership = await createPersonalWorkspace(db, userId, String(user.name ?? "My"));
  }

  const company = await db
    .collection<CompanyDoc>(COLLECTIONS.companies)
    .findOne(
      { organizationId: membership.organizationId, isActive: true },
      { sort: { createdAt: 1 } }
    );
  if (!company) {
    throw new AppError("INTERNAL", "No active company is configured for this workspace.");
  }

  return {
    db,
    requestId,
    userId,
    organizationId: membership.organizationId,
    companyId: company._id,
    role: membership.role,
    currencyCode: company.currencyCode,
    permissions: permissionsForRole(membership.role),
  };
}

/** Page-level variant: unauthenticated visitors are sent to the login page. */
export async function getPageWorkspace(): Promise<WorkspaceContext> {
  try {
    return await resolveWorkspace();
  } catch (error) {
    if (isAppError(error) && error.code === "UNAUTHENTICATED") {
      redirect("/login");
    }
    throw error;
  }
}

export function requirePermission(ctx: Pick<WorkspaceContext, "permissions">, permission: Permission): void {
  assertPermission(ctx.permissions, permission);
}

async function findActiveMembership(db: Db, userId: ObjectId): Promise<MembershipDoc | null> {
  return db
    .collection<MembershipDoc>(COLLECTIONS.memberships)
    .findOne({ userId, status: "active" }, { sort: { createdAt: 1 } });
}

/**
 * Creates a single-user organization, its default company, and the owner membership.
 * The membership is inserted last and guarded by a unique partial index, so concurrent
 * first requests converge on one membership. A losing request removes its orphaned
 * organization and company.
 */
async function createPersonalWorkspace(db: Db, userId: ObjectId, displayName: string): Promise<MembershipDoc> {
  const now = new Date();
  const organizationId = new ObjectId();
  const companyId = new ObjectId();

  await db.collection<OrganizationDoc>(COLLECTIONS.organizations).insertOne({
    _id: organizationId,
    name: `${displayName.slice(0, 80)} workspace`,
    slug: `ws-${organizationId.toHexString()}`,
    ownerUserId: userId,
    status: "active",
    createdAt: now,
  });
  await db.collection<CompanyDoc>(COLLECTIONS.companies).insertOne({
    _id: companyId,
    organizationId,
    name: "Main company",
    currencyCode: DEFAULT_CURRENCY,
    timezone: DEFAULT_TIMEZONE,
    isActive: true,
    createdAt: now,
  });

  const membership: MembershipDoc = {
    _id: new ObjectId(),
    organizationId,
    userId,
    role: "owner",
    status: "active",
    isPersonal: true,
    createdAt: now,
  };
  try {
    await db.collection<MembershipDoc>(COLLECTIONS.memberships).insertOne(membership);
    return membership;
  } catch (error) {
    await db.collection(COLLECTIONS.companies).deleteOne({ _id: companyId });
    await db.collection(COLLECTIONS.organizations).deleteOne({ _id: organizationId });
    const existing = await findActiveMembership(db, userId);
    if (existing) return existing;
    throw error;
  }
}
