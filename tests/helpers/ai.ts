import { ObjectId, type Db } from "mongodb";
import type { CompanyRole } from "@/features/company/types";
import type { AiActorContext } from "@/server/ai/access/access.service";
import { COLLECTIONS } from "@/server/db/documents";
import type { TestHarness } from "./workspace";

export type SeededMember = { userId: ObjectId; companyId: ObjectId; role: CompanyRole };

/** Creates a verified user and an active membership, the way the live resolver expects to find them. */
export async function seedMember(db: Db, companyId: ObjectId, role: CompanyRole, userId = new ObjectId()): Promise<SeededMember> {
  await db.collection("users").insertOne({
    _id: userId,
    name: `${role} ${userId.toHexString().slice(-4)}`,
    email: `${userId.toHexString()}@example.test`,
    status: "active",
    emailVerified: new Date(),
  });
  await db.collection(COLLECTIONS.companyMembers).insertOne({
    _id: new ObjectId(),
    companyId,
    userId,
    role,
    status: "active",
    createdAt: new Date(),
  });
  return { userId, companyId, role };
}

export function actorOf(h: TestHarness, member: SeededMember): AiActorContext {
  return { db: h.db, companyId: member.companyId, userId: member.userId, requestId: `test-${new ObjectId().toHexString()}` };
}

/** Two companies, each with members of every role, so isolation tests have something to cross. */
export async function seedTenants(h: TestHarness) {
  const a = h.ctx().companyId;
  const b = h.otherTenant().companyId;
  const A = {
    owner: await seedMember(h.db, a, "owner"),
    admin: await seedMember(h.db, a, "admin"),
    admin2: await seedMember(h.db, a, "admin"),
    manager: await seedMember(h.db, a, "manager"),
    employee: await seedMember(h.db, a, "employee"),
  };
  const B = {
    owner: await seedMember(h.db, b, "owner"),
    admin: await seedMember(h.db, b, "admin"),
    employee: await seedMember(h.db, b, "employee"),
  };
  return { A, B, companyA: a, companyB: b };
}

import { permissionsForRole, workspaceRoleFor } from "@/server/security/permissions";
import type { WorkspaceContext } from "@/server/tenancy/workspace";

/** A WorkspaceContext for a seeded member, shaped exactly as resolveWorkspace would build it. */
export function wsOf(h: TestHarness, member: SeededMember): WorkspaceContext {
  const role = workspaceRoleFor(member.role);
  return {
    db: h.db,
    requestId: `test-${new ObjectId().toHexString()}`,
    userId: member.userId,
    companyId: member.companyId,
    role,
    currencyCode: "TND",
    permissions: permissionsForRole(role),
  };
}
