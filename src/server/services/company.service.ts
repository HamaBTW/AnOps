import "server-only";
import { ObjectId } from "mongodb";
import clientPromise from "@/server/db/client";
import type { Company, CompanyMember, CreateCompanyInput } from "@/features/company/types";
import { seedHrDefaultsForCompany } from "./hr.service";

async function getDb() {
  const client = await clientPromise;
  return client.db();
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Creates a new Company organization for a user, registers them as owner,
 * and seeds initial default departments and job titles for that company.
 */
export async function createCompany(
  userId: string,
  data: CreateCompanyInput
): Promise<Company> {
  const db = await getDb();
  const trimmedName = data.name.trim();

  let baseSlug = slugify(trimmedName) || "company";
  let uniqueSlug = baseSlug;
  let counter = 1;

  while (await db.collection("companies").findOne({ slug: uniqueSlug })) {
    uniqueSlug = `${baseSlug}-${counter}`;
    counter++;
  }

  const now = new Date();
  const companyDoc = {
    name: trimmedName,
    slug: uniqueSlug,
    ownerId: new ObjectId(userId),
    currency: data.currency || "TND",
    industry: data.industry?.trim() || "General",
    createdAt: now,
    updatedAt: now,
  };

  const insertResult = await db.collection("companies").insertOne(companyDoc);
  const companyId = insertResult.insertedId;

  // Add user as Company Owner
  await db.collection("company_members").insertOne({
    companyId,
    userId: new ObjectId(userId),
    role: "owner",
    status: "active",
    createdAt: now,
    updatedAt: now,
  });

  // Seed default HR data (departments, job titles, demo staff) for this new company
  await seedHrDefaultsForCompany(companyId.toString());

  return {
    id: companyId.toString(),
    name: companyDoc.name,
    slug: companyDoc.slug,
    ownerId: userId,
    currency: companyDoc.currency,
    industry: companyDoc.industry,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

/**
 * Returns all companies that a user owns or is a member of.
 */
export async function getUserCompanies(userId: string): Promise<Company[]> {
  const db = await getDb();
  if (!ObjectId.isValid(userId)) return [];

  const memberships = await db
    .collection("company_members")
    .find({ userId: new ObjectId(userId), status: "active" })
    .toArray();

  if (memberships.length === 0) {
    return [];
  }

  const companyIds = memberships.map((m) => m.companyId as ObjectId);
  const companyDocs = await db
    .collection("companies")
    .find({ _id: { $in: companyIds } })
    .toArray();

  return companyDocs.map((doc) => ({
    id: doc._id.toString(),
    name: doc.name as string,
    slug: doc.slug as string,
    ownerId: doc.ownerId.toString(),
    currency: (doc.currency as string) || "TND",
    industry: doc.industry as string | undefined,
    logoUrl: doc.logoUrl as string | undefined,
    createdAt: doc.createdAt ? (doc.createdAt as Date).toISOString() : undefined,
    updatedAt: doc.updatedAt ? (doc.updatedAt as Date).toISOString() : undefined,
  }));
}

/**
 * Fetches a single company by ID.
 */
export async function getCompanyById(companyId: string): Promise<Company | null> {
  const db = await getDb();
  if (!ObjectId.isValid(companyId)) return null;

  const doc = await db.collection("companies").findOne({ _id: new ObjectId(companyId) });
  if (!doc) return null;

  return {
    id: doc._id.toString(),
    name: doc.name as string,
    slug: doc.slug as string,
    ownerId: doc.ownerId.toString(),
    currency: (doc.currency as string) || "TND",
    industry: doc.industry as string | undefined,
    logoUrl: doc.logoUrl as string | undefined,
    createdAt: doc.createdAt ? (doc.createdAt as Date).toISOString() : undefined,
    updatedAt: doc.updatedAt ? (doc.updatedAt as Date).toISOString() : undefined,
  };
}

/**
 * Checks a user's membership and role in a specific company.
 */
export async function getCompanyMember(
  companyId: string,
  userId: string
): Promise<CompanyMember | null> {
  const db = await getDb();
  if (!ObjectId.isValid(companyId) || !ObjectId.isValid(userId)) return null;

  const doc = await db.collection("company_members").findOne({
    companyId: new ObjectId(companyId),
    userId: new ObjectId(userId),
    status: "active",
  });

  if (!doc) return null;

  return {
    id: doc._id.toString(),
    companyId: doc.companyId.toString(),
    userId: doc.userId.toString(),
    role: doc.role,
    status: doc.status,
    createdAt: doc.createdAt ? (doc.createdAt as Date).toISOString() : undefined,
    updatedAt: doc.updatedAt ? (doc.updatedAt as Date).toISOString() : undefined,
  };
}
