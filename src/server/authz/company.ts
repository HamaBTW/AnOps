import "server-only";
import { ObjectId, type Db } from "mongodb";
import { cookies } from "next/headers";
import clientPromise from "@/server/db/client";

export const ACTIVE_COMPANY_COOKIE = "anops_active_company";
export const activeCompanyCookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 30 };

export const companyRoles = ["owner", "admin", "marketing_manager", "marketing_operator", "viewer"] as const;
export type CompanyRole = (typeof companyRoles)[number];
export const permissions = ["company.read", "company.update", "membership.read", "membership.manage", "marketing.contacts.read", "marketing.contacts.manage", "marketing.campaigns.read", "marketing.campaigns.manage", "marketing.campaigns.approve", "marketing.deliveries.read", "marketing.deliveries.retry", "marketing.social.read", "marketing.social.manage", "marketing.social.publish", "marketing.social.accounts.manage", "marketing.ai.generate"] as const;
export type Permission = (typeof permissions)[number];

const rolePermissions: Record<CompanyRole, readonly Permission[]> = {
  owner: permissions,
  admin: permissions.filter((permission) => permission !== "company.update"),
  marketing_manager: ["company.read", "membership.read", "marketing.contacts.read", "marketing.contacts.manage", "marketing.campaigns.read", "marketing.campaigns.manage", "marketing.campaigns.approve", "marketing.deliveries.read", "marketing.deliveries.retry", "marketing.social.read", "marketing.social.manage", "marketing.social.publish", "marketing.social.accounts.manage", "marketing.ai.generate"],
  marketing_operator: ["company.read", "marketing.contacts.read", "marketing.contacts.manage", "marketing.campaigns.read", "marketing.campaigns.manage", "marketing.deliveries.read", "marketing.social.read", "marketing.social.manage", "marketing.ai.generate"],
  viewer: ["company.read", "marketing.contacts.read", "marketing.campaigns.read", "marketing.deliveries.read", "marketing.social.read"],
};

export function roleAllows(role: CompanyRole, permission: Permission) { return rolePermissions[role]?.includes(permission) ?? false; }
export function canAssignRole(actor: CompanyRole, target: CompanyRole) { return (actor === "owner" || actor === "admin") && target !== "owner"; }

type CompanyDoc = { _id?: ObjectId; name: string; status: "active" | "suspended" | "archived"; createdByUserId: string; createdAt: Date; updatedAt: Date };
type MembershipDoc = { _id?: ObjectId; companyId: ObjectId; userId: string; userEmail: string; role: CompanyRole; status: "active" | "suspended" | "removed"; createdAt: Date; updatedAt: Date };
export type CompanyContext = { companyId: string; userId: string; userEmail: string; role: CompanyRole; permissions: readonly Permission[] };
async function db(): Promise<Db> { const client = await clientPromise; return client.db(); }

export async function ensureCompanyIndexes() { const database = await db(); await Promise.all([database.collection("companies").createIndex({ createdByUserId: 1, name: 1 }), database.collection("company_memberships").createIndex({ companyId: 1, userId: 1 }, { unique: true }), database.collection("company_memberships").createIndex({ userId: 1, status: 1, updatedAt: -1 }), database.collection("company_memberships").createIndex({ companyId: 1, status: 1, role: 1 })]); }

const marketingCompanyCollections = ["marketing_contacts", "marketing_tags", "marketing_audiences", "marketing_audience_members", "marketing_consents", "marketing_campaigns", "marketing_templates", "marketing_campaign_deliveries", "marketing_campaign_events", "marketing_delivery_events", "marketing_social_accounts", "marketing_social_posts", "marketing_social_publish_attempts", "marketing_ai_generations", "marketing_oauth_states"];
async function migrateMarketingCollections(database: Db, email: string, companyId: ObjectId) { await Promise.all(marketingCompanyCollections.map((name) => database.collection(name).updateMany({ ownerEmail: email, companyId: { $exists: false } }, { $set: { companyId } }))); }

export async function createCompany(userId: string, userEmail: string, name: string) { const trimmed = name.trim(); if (!trimmed || trimmed.length > 160) throw new Error("INVALID_COMPANY"); const database = await db(); await ensureCompanyIndexes(); const now = new Date(); const company = await database.collection<CompanyDoc>("companies").insertOne({ name: trimmed, status: "active", createdByUserId: userId, createdAt: now, updatedAt: now }); await database.collection<MembershipDoc>("company_memberships").insertOne({ companyId: company.insertedId, userId, userEmail: userEmail.toLowerCase().trim(), role: "owner", status: "active", createdAt: now, updatedAt: now }); return { id: company.insertedId.toHexString(), name: trimmed, role: "owner" as const, status: "active" as const }; }

export async function listMyCompanies(userId: string) { const database = await db(); await ensureCompanyIndexes(); const memberships = await database.collection<MembershipDoc>("company_memberships").find({ userId, status: "active" }).sort({ updatedAt: -1 }).toArray(); const ids = memberships.map((membership) => membership.companyId); const companies = ids.length ? await database.collection<CompanyDoc>("companies").find({ _id: { $in: ids }, status: "active" }).toArray() : []; const byId = new Map(companies.map((company) => [company._id.toHexString(), company])); return memberships.flatMap((membership) => { const company = byId.get(membership.companyId.toHexString()); return company ? [{ id: company._id.toHexString(), name: company.name, status: company.status, role: membership.role }] : []; }); }

export async function ensureLegacyCompany(userId: string, userEmail: string) {
  const database = await db();
  await ensureCompanyIndexes();
  const email = userEmail.toLowerCase().trim();
  const existing = await database.collection<MembershipDoc>("company_memberships").findOne({ userId, status: "active" });
  if (existing) {
    await migrateMarketingCollections(database, email, existing.companyId);
    return existing.companyId.toHexString();
  }
  const now = new Date();
  const company = await database.collection<CompanyDoc>("companies").insertOne({ name: `${email}'s workspace`, status: "active", createdByUserId: userId, createdAt: now, updatedAt: now });
  await database.collection<MembershipDoc>("company_memberships").insertOne({ companyId: company.insertedId, userId, userEmail: email, role: "owner", status: "active", createdAt: now, updatedAt: now });
  await migrateMarketingCollections(database, email, company.insertedId);
  return company.insertedId.toHexString();
}
export async function getSelectedCompanyId() { return (await cookies()).get(ACTIVE_COMPANY_COOKIE)?.value ?? null; }

export async function companyIdForEmail(userEmail: string, requestedCompanyId?: string) {
  const database = await db();
  const email = userEmail.toLowerCase().trim();
  const memberships = await database.collection<MembershipDoc>("company_memberships").find({ userEmail: email, status: "active" }).toArray();
  if (!memberships.length) throw new Error("FORBIDDEN");
  const activeIds = memberships.map((membership) => membership.companyId);
  const companies = await database.collection<CompanyDoc>("companies").find({ _id: { $in: activeIds }, status: "active" }).project({ _id: 1 }).toArray();
  const eligible = new Set(companies.map((company) => company._id.toHexString()));
  const selected = requestedCompanyId ?? await getSelectedCompanyId();
  if (selected) {
    if (!ObjectId.isValid(selected) || !eligible.has(selected)) throw new Error("FORBIDDEN");
    return new ObjectId(selected);
  }
  if (eligible.size === 1) return new ObjectId([...eligible][0]);
  throw new Error("COMPANY_REQUIRED");
}

export async function requireCompanyContext(userId: string, userEmail: string, companyId?: string, required?: Permission): Promise<CompanyContext> { const database = await db(); await ensureCompanyIndexes(); await ensureLegacyCompany(userId, userEmail); const selectedId = await companyIdForEmail(userEmail, companyId); const membership = await database.collection<MembershipDoc>("company_memberships").findOne({ userId, companyId: selectedId, status: "active" }); if (!membership) throw new Error("FORBIDDEN"); const company = await database.collection<CompanyDoc>("companies").findOne({ _id: selectedId, status: "active" }); if (!company) throw new Error("FORBIDDEN"); if (required && !roleAllows(membership.role, required)) throw new Error("FORBIDDEN"); return { companyId: company._id.toHexString(), userId, userEmail: userEmail.toLowerCase().trim(), role: membership.role, permissions: rolePermissions[membership.role] }; }

export async function listCompanyMembers(actor: CompanyContext) { const database = await db(); if (!roleAllows(actor.role, "membership.read")) throw new Error("FORBIDDEN"); return database.collection<MembershipDoc>("company_memberships").find({ companyId: new ObjectId(actor.companyId), status: { $in: ["active", "suspended"] } }).project({ userId: 1, userEmail: 1, role: 1, status: 1, createdAt: 1, updatedAt: 1 }).sort({ createdAt: 1 }).toArray(); }

export async function changeMemberRole(actor: CompanyContext, targetUserId: string, role: CompanyRole) { if (!roleAllows(actor.role, "membership.manage") || !canAssignRole(actor.role, role) || targetUserId === actor.userId) throw new Error("FORBIDDEN"); const database = await db(); const target = await database.collection<MembershipDoc>("company_memberships").findOne({ companyId: new ObjectId(actor.companyId), userId: targetUserId, status: "active" }); if (!target) throw new Error("NOT_FOUND"); await database.collection<MembershipDoc>("company_memberships").updateOne({ _id: target._id, companyId: new ObjectId(actor.companyId), status: "active" }, { $set: { role, updatedAt: new Date() } }); }

export async function changeMemberStatus(actor: CompanyContext, targetUserId: string, status: "active" | "suspended" | "removed") { if (!roleAllows(actor.role, "membership.manage") || targetUserId === actor.userId) throw new Error("FORBIDDEN"); const database = await db(); const target = await database.collection<MembershipDoc>("company_memberships").findOne({ companyId: new ObjectId(actor.companyId), userId: targetUserId, status: "active" }); if (!target) throw new Error("NOT_FOUND"); if (target.role === "owner" && status !== "active") { const owners = await database.collection<MembershipDoc>("company_memberships").countDocuments({ companyId: new ObjectId(actor.companyId), role: "owner", status: "active" }); if (owners <= 1) throw new Error("LAST_OWNER"); } await database.collection<MembershipDoc>("company_memberships").updateOne({ _id: target._id, companyId: new ObjectId(actor.companyId), status: "active" }, { $set: { status, updatedAt: new Date() } }); }
