import { MongoClient, ObjectId, type Db } from "mongodb";
import { ensureIndexes } from "@/server/db/indexes";
import { permissionsForRole, type MembershipRole } from "@/server/security/permissions";
import type { WorkspaceContext } from "@/server/tenancy/workspace";

/**
 * Integration-test harness. Each test file gets its own database on a MongoDB replica
 * set (transactions require one). Point MONGODB_TEST_URI at a disposable instance; never
 * at a database that holds real data. The harness drops its database on cleanup.
 */
export type TestHarness = {
  db: Db;
  /** The primary tenant. */
  ctx: (role?: MembershipRole) => WorkspaceContext;
  /** A second tenant that shares the same database, for isolation tests. */
  otherTenant: (role?: MembershipRole) => WorkspaceContext;
  cleanup: () => Promise<void>;
};

const DEFAULT_TEST_URI = "mongodb://127.0.0.1:27018/?replicaSet=rs0&directConnection=true";

export async function createHarness(): Promise<TestHarness> {
  const client = new MongoClient(process.env.MONGODB_TEST_URI ?? DEFAULT_TEST_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  await client.connect();
  const db = client.db(`anops_test_${new ObjectId().toHexString()}`);
  await ensureIndexes(db);

  const primary = { organizationId: new ObjectId(), companyId: new ObjectId(), userId: new ObjectId() };
  const secondary = { organizationId: new ObjectId(), companyId: new ObjectId(), userId: new ObjectId() };

  const build = (tenant: typeof primary, role: MembershipRole): WorkspaceContext => ({
    db,
    requestId: `test-${new ObjectId().toHexString()}`,
    userId: tenant.userId,
    organizationId: tenant.organizationId,
    companyId: tenant.companyId,
    role,
    currencyCode: "TND",
    permissions: permissionsForRole(role),
  });

  return {
    db,
    ctx: (role = "owner") => build(primary, role),
    otherTenant: (role = "owner") => build(secondary, role),
    cleanup: async () => {
      await db.dropDatabase();
      await client.close();
    },
  };
}

/** Parses a plain object through the real schema so tests exercise the same validation as production. */
export function parsed<T>(schema: { parse: (value: unknown) => T }, value: unknown): T {
  return schema.parse(value);
}
