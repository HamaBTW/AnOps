import "server-only";

import { ObjectId, type Db, type Filter, type Sort } from "mongodb";
import clientPromise from "@/server/db/client";
import { audienceInputSchema, campaignInputSchema, consentRecordSchema, contactInputSchema, contactQuerySchema, membershipSchema, templateInputSchema, type ContactInput } from "@/features/marketing/schemas/marketing.schema";
import type { ContactListResult, MarketingContact } from "@/features/marketing/types";
import { ensureLegacyCompany, requireCompanyContext, type Permission } from "@/server/authz/company";
import { companyIdForEmail } from "@/server/authz/company";

type ScopedDocument = { companyId: ObjectId; ownerEmail: string; createdAt: Date; updatedAt: Date };
type ContactDocument = ScopedDocument & ContactInput & { normalizedEmail?: string; normalizedPhone?: string; isActive: boolean };
type TagDocument = ScopedDocument & { name: string; color?: string };
type AudienceDocument = ScopedDocument & { name: string; description: string; isActive: boolean };
type CampaignDocument = ScopedDocument & { name: string; channel: "email" | "sms"; subject?: string; body: string; audienceId: ObjectId; status: "draft" | "pending_approval" | "approved" | "scheduled" | "cancelled" | "failed"; scheduledAt?: Date; approvedAt?: Date; snapshot?: { subject?: string; body: string; recipientCount: number } };
type TemplateDocument = ScopedDocument & { name: string; description: string; channel: "email" | "sms"; subject?: string; body: string; creatorEmail: string; archived: boolean };

function normalizeEmail(value?: string): string | undefined { return value?.trim().toLowerCase() || undefined; }
function normalizePhone(value?: string): string | undefined { return value?.replace(/[^\d+]/g, "") || undefined; }

async function db(): Promise<Db> { const client = await clientPromise; return client.db(); }

export async function ensureMarketingIndexes(): Promise<void> {
  const database = await db();
  await Promise.all([
    database.collection("marketing_contacts").createIndex({ companyId: 1, normalizedEmail: 1 }, { unique: true, sparse: true }),
    database.collection("marketing_contacts").createIndex({ companyId: 1, normalizedPhone: 1 }, { unique: true, sparse: true }),
    database.collection("marketing_contacts").createIndex({ companyId: 1, isActive: 1, updatedAt: -1 }),
    database.collection("marketing_contacts").createIndex({ companyId: 1, lifecycleStage: 1, source: 1 }),
    database.collection("marketing_tags").createIndex({ companyId: 1, name: 1 }, { unique: true }),
    database.collection("marketing_audiences").createIndex({ companyId: 1, isActive: 1, updatedAt: -1 }),
    database.collection("marketing_audience_members").createIndex({ companyId: 1, audienceId: 1, contactId: 1 }, { unique: true }),
    database.collection("marketing_consents").createIndex({ companyId: 1, contactId: 1, channel: 1, purpose: 1, recordedAt: -1 }),
    database.collection("marketing_templates").createIndex({ companyId: 1, archived: 1, updatedAt: -1 }),
    database.collection("marketing_templates").createIndex({ companyId: 1, channel: 1, name: 1 }),
  ]);
}

function toContact(document: ContactDocument & { _id: ObjectId }, tags: MarketingContact["tags"]): MarketingContact {
  return {
    id: document._id.toHexString(), firstName: document.firstName, lastName: document.lastName,
    email: document.email || undefined, phone: document.phone || undefined, source: document.source,
    lifecycleStage: document.lifecycleStage, isActive: document.isActive, tagIds: document.tagIds ?? [], tags,
    createdAt: document.createdAt.toISOString(), updatedAt: document.updatedAt.toISOString(),
  };
}

export async function listContacts(ownerEmail: string, rawQuery: Record<string, string | undefined>): Promise<ContactListResult> {
  const query = contactQuerySchema.parse(rawQuery);
  const database = await db(); await ensureMarketingIndexes(); const companyId = await companyIdForEmail(ownerEmail);
  const filter: Filter<ContactDocument> = { companyId, ...(query.active === "all" ? {} : { isActive: query.active === "true" }) };
  if (query.lifecycleStage) filter.lifecycleStage = query.lifecycleStage;
  if (query.source) filter.source = query.source;
  if (query.search) {
    const safeSearch = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [{ firstName: { $regex: safeSearch, $options: "i" } }, { lastName: { $regex: safeSearch, $options: "i" } }, { email: { $regex: safeSearch, $options: "i" } }];
  }
  const sort: Sort = query.sort === "name" ? { firstName: query.direction === "asc" ? 1 : -1, lastName: query.direction === "asc" ? 1 : -1 } : { [query.sort]: query.direction === "asc" ? 1 : -1 };
  const contacts = await database.collection<ContactDocument>("marketing_contacts").find(filter).sort(sort).skip((query.page - 1) * query.pageSize).limit(query.pageSize).toArray();
  const total = await database.collection<ContactDocument>("marketing_contacts").countDocuments(filter);
  const tagIds = [...new Set(contacts.flatMap((contact) => contact.tagIds ?? []))].filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  const tagDocs = tagIds.length ? await database.collection<TagDocument>("marketing_tags").find({ companyId, _id: { $in: tagIds } }).toArray() : [];
  const tagsById = new Map(tagDocs.map((tag) => [tag._id.toHexString(), { id: tag._id.toHexString(), name: String(tag.name), color: String(tag.color ?? "#c8f03e") }]));
  return { items: contacts.map((contact) => toContact(contact as ContactDocument & { _id: ObjectId }, (contact.tagIds ?? []).map((id) => tagsById.get(id)).filter((tag): tag is NonNullable<typeof tag> => Boolean(tag)))), total, page: query.page, pageSize: query.pageSize };
}

export async function createContact(ownerEmail: string, input: ContactInput): Promise<MarketingContact> {
  const data = contactInputSchema.parse(input); const database = await db(); await ensureMarketingIndexes(); const companyId = await companyIdForEmail(ownerEmail);
  const now = new Date(); const document: ContactDocument = { ...data, companyId, ownerEmail: ownerEmail.toLowerCase().trim(), normalizedEmail: normalizeEmail(data.email), normalizedPhone: normalizePhone(data.phone), isActive: true, createdAt: now, updatedAt: now };
  const duplicate = await database.collection<ContactDocument>("marketing_contacts").findOne({ companyId, $or: [{ ...(document.normalizedEmail ? { normalizedEmail: document.normalizedEmail } : { _id: new ObjectId("000000000000000000000000") }) }, { ...(document.normalizedPhone ? { normalizedPhone: document.normalizedPhone } : { _id: new ObjectId("000000000000000000000000") }) }] });
  if (duplicate) throw new Error("CONTACT_DUPLICATE");
  const result = await database.collection<ContactDocument>("marketing_contacts").insertOne(document); return toContact({ ...document, _id: result.insertedId }, []);
}

export async function setContactActive(ownerEmail: string, contactId: string, isActive: boolean): Promise<boolean> {
  if (!ObjectId.isValid(contactId)) return false; const database = await db(); const companyId = await companyIdForEmail(ownerEmail);
  const result = await database.collection<ContactDocument>("marketing_contacts").updateOne({ companyId, _id: new ObjectId(contactId) }, { $set: { isActive, updatedAt: new Date() } }); return result.modifiedCount === 1;
}

export async function marketingScopeForUser(email: string): Promise<string> { const database = await db(); const normalized = email.toLowerCase().trim(); const user = await database.collection("users").findOne({ email: normalized }, { projection: { _id: 1 } }); if (!user) throw new Error("FORBIDDEN"); await ensureLegacyCompany(user._id.toHexString(), normalized); return normalized; }
export async function requireMarketingPermission(email: string, permission: Permission): Promise<string> { const database = await db(); const normalized = email.toLowerCase().trim(); const user = await database.collection("users").findOne({ email: normalized }, { projection: { _id: 1 } }); if (!user) throw new Error("FORBIDDEN"); await requireCompanyContext(user._id.toHexString(), normalized, undefined, permission); return normalized; }

export async function listAudiences(ownerEmail: string) {
  const database = await db(); await ensureMarketingIndexes(); const owner = ownerEmail.toLowerCase().trim(); const companyId = await companyIdForEmail(owner);
  const audiences = await database.collection<AudienceDocument>("marketing_audiences").find({ companyId }).sort({ updatedAt: -1 }).limit(100).toArray();
  return Promise.all(audiences.map(async (audience) => {
    const members = await database.collection("marketing_audience_members").countDocuments({ companyId, audienceId: audience._id });
    const eligible = await database.collection("marketing_audience_members").aggregate([{ $match: { companyId, audienceId: audience._id } }, { $lookup: { from: "marketing_contacts", let: { contactId: "$contactId", companyId: "$companyId" }, pipeline: [{ $match: { $expr: { $and: [{ $eq: ["$_id", "$$contactId"] }, { $eq: ["$companyId", "$$companyId"] }] } } }], as: "contact" } }, { $unwind: "$contact" }, { $match: { "contact.isActive": true } }, { $lookup: { from: "marketing_consents", let: { contactId: "$contactId", companyId: "$companyId" }, pipeline: [{ $match: { $expr: { $and: [{ $eq: ["$contactId", "$$contactId"] }, { $eq: ["$companyId", "$$companyId"] }, { $eq: ["$channel", "email"] }, { $eq: ["$status", "granted"] }] } } }], as: "consent" } }, { $match: { consent: { $ne: [] } } }, { $count: "count" }]).toArray();
    return { id: audience._id.toHexString(), name: audience.name, description: audience.description, isActive: audience.isActive, memberCount: members, eligibleCount: Number(eligible[0]?.count ?? 0), createdAt: audience.createdAt.toISOString(), updatedAt: audience.updatedAt.toISOString() };
  }));
}

export async function createAudience(ownerEmail: string, raw: unknown) {
  const data = audienceInputSchema.parse(raw); const database = await db(); await ensureMarketingIndexes(); const now = new Date(); const owner = ownerEmail.toLowerCase().trim(); const companyId = await companyIdForEmail(owner);
  const result = await database.collection<AudienceDocument>("marketing_audiences").insertOne({ ...data, companyId, ownerEmail: owner, isActive: true, createdAt: now, updatedAt: now });
  return { id: result.insertedId.toHexString(), ...data, isActive: true, memberCount: 0, eligibleCount: 0, createdAt: now.toISOString(), updatedAt: now.toISOString() };
}

export async function addAudienceMember(ownerEmail: string, audienceId: string, raw: unknown) {
  const { contactId } = membershipSchema.parse(raw); if (!ObjectId.isValid(audienceId) || !ObjectId.isValid(contactId)) throw new Error("INVALID_ID"); const database = await db(); const owner = ownerEmail.toLowerCase().trim(); const companyId = await companyIdForEmail(owner);
  const [audience, contact] = await Promise.all([database.collection<AudienceDocument>("marketing_audiences").findOne({ _id: new ObjectId(audienceId), companyId }), database.collection<ContactDocument>("marketing_contacts").findOne({ _id: new ObjectId(contactId), companyId })]);
  if (!audience || !contact) throw new Error("NOT_FOUND");
  try { await database.collection("marketing_audience_members").insertOne({ companyId, ownerEmail: owner, audienceId: new ObjectId(audienceId), contactId: new ObjectId(contactId), addedAt: new Date() }); } catch (error) { if (error instanceof Error && error.message.includes("duplicate")) throw new Error("MEMBER_DUPLICATE"); throw error; }
}

export async function recordConsent(ownerEmail: string, contactId: string, raw: unknown) {
  const data = consentRecordSchema.parse(raw); if (!ObjectId.isValid(contactId)) throw new Error("INVALID_ID"); const database = await db(); const owner = ownerEmail.toLowerCase().trim(); const companyId = await companyIdForEmail(owner);
  const exists = await database.collection<ContactDocument>("marketing_contacts").findOne({ _id: new ObjectId(contactId), companyId }); if (!exists) throw new Error("NOT_FOUND");
  const now = new Date(); await database.collection("marketing_consents").insertOne({ ...data, companyId, ownerEmail: owner, contactId: new ObjectId(contactId), recordedAt: now, withdrawnAt: data.status === "revoked" ? now : undefined }); return { ...data, recordedAt: now.toISOString(), withdrawnAt: data.status === "revoked" ? now.toISOString() : undefined };
}

export async function listCampaigns(ownerEmail: string) { const database = await db(); const companyId = await companyIdForEmail(ownerEmail); const docs = await database.collection<CampaignDocument>("marketing_campaigns").find({ companyId }).sort({ updatedAt: -1 }).limit(100).toArray(); return docs.map((doc) => ({ id: doc._id.toHexString(), name: doc.name, channel: doc.channel, subject: doc.subject, body: doc.body, audienceId: doc.audienceId.toHexString(), status: doc.status, scheduledAt: doc.scheduledAt?.toISOString(), approvedAt: doc.approvedAt?.toISOString(), snapshot: doc.snapshot, createdAt: doc.createdAt.toISOString(), updatedAt: doc.updatedAt.toISOString() })); }

export async function createCampaign(ownerEmail: string, raw: unknown) { const data = campaignInputSchema.parse(raw); const database = await db(); const owner = ownerEmail.toLowerCase().trim(); const companyId = await companyIdForEmail(owner); const audience = await database.collection<AudienceDocument>("marketing_audiences").findOne({ _id: new ObjectId(data.audienceId), companyId, isActive: true }); if (!audience) throw new Error("AUDIENCE_NOT_FOUND"); const now = new Date(); const doc: CampaignDocument = { ...data, companyId, audienceId: new ObjectId(data.audienceId), status: "draft", scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined, ownerEmail: owner, createdAt: now, updatedAt: now }; const result = await database.collection<CampaignDocument>("marketing_campaigns").insertOne(doc); return { id: result.insertedId.toHexString(), ...data, status: "draft", createdAt: now.toISOString(), updatedAt: now.toISOString() }; }

export async function getCampaign(ownerEmail: string, campaignId: string) { if (!ObjectId.isValid(campaignId)) throw new Error("NOT_FOUND"); const database = await db(); const doc = await database.collection<CampaignDocument>("marketing_campaigns").findOne({ _id: new ObjectId(campaignId), companyId: await companyIdForEmail(ownerEmail) }); if (!doc) throw new Error("NOT_FOUND"); return { id: doc._id.toHexString(), name: doc.name, channel: doc.channel, subject: doc.subject, body: doc.body, audienceId: doc.audienceId.toHexString(), status: doc.status, scheduledAt: doc.scheduledAt?.toISOString(), approvedAt: doc.approvedAt?.toISOString(), snapshot: doc.snapshot, createdAt: doc.createdAt.toISOString(), updatedAt: doc.updatedAt.toISOString() }; }
export async function updateCampaign(ownerEmail: string, campaignId: string, raw: unknown) { const data = campaignInputSchema.parse(raw); if (!ObjectId.isValid(campaignId)) throw new Error("NOT_FOUND"); const database = await db(); const owner = ownerEmail.toLowerCase().trim(); const companyId = await companyIdForEmail(owner); const current = await database.collection<CampaignDocument>("marketing_campaigns").findOne({ _id: new ObjectId(campaignId), companyId }); if (!current) throw new Error("NOT_FOUND"); if (current.status !== "draft") throw new Error("DRAFT_ONLY"); const audience = await database.collection<AudienceDocument>("marketing_audiences").findOne({ _id: new ObjectId(data.audienceId), companyId, isActive: true }); if (!audience) throw new Error("AUDIENCE_NOT_FOUND"); await database.collection<CampaignDocument>("marketing_campaigns").updateOne({ _id: current._id, companyId, status: "draft" }, { $set: { ...data, audienceId: new ObjectId(data.audienceId), scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined, updatedAt: new Date() } }); return getCampaign(owner, campaignId); }
export async function duplicateCampaign(ownerEmail: string, campaignId: string) { const current = await getCampaign(ownerEmail, campaignId); return createCampaign(ownerEmail, { name: `${current.name} copy`, channel: current.channel, subject: current.subject ?? "", body: current.body, audienceId: current.audienceId }); }

function publicTemplate(doc: TemplateDocument & { _id: ObjectId }) { return { id: doc._id.toHexString(), name: doc.name, description: doc.description, channel: doc.channel, subject: doc.subject, body: doc.body, archived: doc.archived, createdAt: doc.createdAt.toISOString(), updatedAt: doc.updatedAt.toISOString() }; }
export async function listTemplates(ownerEmail: string, search = "") { const database = await db(); const filter: Filter<TemplateDocument> = { companyId: await companyIdForEmail(ownerEmail), archived: false }; if (search.trim()) filter.name = { $regex: search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" }; return (await database.collection<TemplateDocument>("marketing_templates").find(filter).sort({ updatedAt: -1 }).limit(100).toArray()).map((doc) => publicTemplate(doc as TemplateDocument & { _id: ObjectId })); }
export async function getTemplate(ownerEmail: string, id: string) { if (!ObjectId.isValid(id)) throw new Error("NOT_FOUND"); const database = await db(); const doc = await database.collection<TemplateDocument>("marketing_templates").findOne({ _id: new ObjectId(id), companyId: await companyIdForEmail(ownerEmail) }); if (!doc) throw new Error("NOT_FOUND"); return publicTemplate(doc as TemplateDocument & { _id: ObjectId }); }
export async function createTemplate(ownerEmail: string, creatorEmail: string, raw: unknown) { const data = templateInputSchema.parse(raw); const database = await db(); const now = new Date(); const doc: TemplateDocument = { ...data, companyId: await companyIdForEmail(ownerEmail), ownerEmail: ownerEmail.toLowerCase().trim(), creatorEmail: creatorEmail.toLowerCase().trim(), archived: false, createdAt: now, updatedAt: now }; const result = await database.collection<TemplateDocument>("marketing_templates").insertOne(doc); return publicTemplate({ ...doc, _id: result.insertedId }); }
export async function updateTemplate(ownerEmail: string, id: string, raw: unknown) { const data = templateInputSchema.parse(raw); if (!ObjectId.isValid(id)) throw new Error("NOT_FOUND"); const database = await db(); const result = await database.collection<TemplateDocument>("marketing_templates").findOneAndUpdate({ _id: new ObjectId(id), companyId: await companyIdForEmail(ownerEmail), archived: false }, { $set: { ...data, updatedAt: new Date() } }, { returnDocument: "after" }); if (!result) throw new Error("NOT_FOUND"); return publicTemplate(result as TemplateDocument & { _id: ObjectId }); }
export async function archiveTemplate(ownerEmail: string, id: string) { if (!ObjectId.isValid(id)) throw new Error("NOT_FOUND"); const database = await db(); const result = await database.collection<TemplateDocument>("marketing_templates").updateOne({ _id: new ObjectId(id), companyId: await companyIdForEmail(ownerEmail), archived: false }, { $set: { archived: true, updatedAt: new Date() } }); if (!result.modifiedCount) throw new Error("NOT_FOUND"); }
export async function duplicateTemplate(ownerEmail: string, creatorEmail: string, id: string) { const source = await getTemplate(ownerEmail, id); return createTemplate(ownerEmail, creatorEmail, { name: `${source.name} copy`, description: source.description, channel: source.channel, subject: source.subject ?? "", body: source.body }); }

const transitions: Record<string, CampaignDocument["status"][]> = { submit: ["draft"], approve: ["pending_approval"], reject: ["pending_approval"], schedule: ["approved"], cancel: ["pending_approval", "approved", "scheduled"] };
export async function transitionCampaign(ownerEmail: string, campaignId: string, command: keyof typeof transitions) { if (!ObjectId.isValid(campaignId) || !transitions[command]) throw new Error("INVALID_COMMAND"); const database = await db(); const companyId = await companyIdForEmail(ownerEmail); const campaign = await database.collection<CampaignDocument>("marketing_campaigns").findOne({ _id: new ObjectId(campaignId), companyId }); if (!campaign || !transitions[command].includes(campaign.status)) throw new Error("INVALID_TRANSITION"); let next: CampaignDocument["status"]; if (command === "submit") next = "pending_approval"; else if (command === "approve") next = "approved"; else if (command === "reject") next = "draft"; else if (command === "schedule") next = "scheduled"; else next = "cancelled"; const set: Partial<CampaignDocument> = { status: next, updatedAt: new Date() }; if (command === "approve") { const recipientCount = await database.collection("marketing_audience_members").countDocuments({ companyId, audienceId: campaign.audienceId }); set.approvedAt = new Date(); set.snapshot = { subject: campaign.subject, body: campaign.body, recipientCount }; } const result = await database.collection<CampaignDocument>("marketing_campaigns").updateOne({ _id: campaign._id, companyId, status: campaign.status }, { $set: set }); if (result.modifiedCount !== 1) throw new Error("CONCURRENT_UPDATE"); return next; }
