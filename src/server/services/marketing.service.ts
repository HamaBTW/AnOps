import "server-only";

import { ObjectId, type Db, type Filter, type Sort } from "mongodb";
import { COLLECTIONS } from "@/server/db/documents";
import { ensureIndexes } from "@/server/db/indexes";
import type { WorkspaceContext } from "@/server/tenancy/workspace";
import { assertPermission, PERMISSIONS } from "@/server/security/permissions";
import { recordAudit } from "@/server/audit/audit.service";
import { AppError } from "@/shared/lib/errors";
import {
  contactInputSchema,
  contactQuerySchema,
  contactUpdateSchema,
  tagInputSchema,
  consentRecordSchema,
  audienceInputSchema,
  templateInputSchema,
  campaignInputSchema,
  type ContactInput,
  type TagInput,
  type ConsentInput,
  type AudienceInput,
  type TemplateInput,
  type CampaignInput,
} from "@/features/marketing/schemas/marketing.schema";
import type {
  MarketingContact,
  ContactListResult,
  ContactTag,
  ConsentRecord,
  Audience,
  CampaignTemplate,
  MarketingCampaign,
  CampaignStatus,
} from "@/features/marketing/types";

// Normalization utilities
export function normalizeEmail(value?: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim().toLowerCase();
  return trimmed || undefined;
}

export function normalizePhone(value?: string | null): string | undefined {
  if (!value) return undefined;
  const digits = value.replace(/[^\d+]/g, "");
  return digits || undefined;
}

export function normalizeTagName(name: string): string {
  return name.trim().toLowerCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. CONTACTS & TAGS
// ─────────────────────────────────────────────────────────────────────────────

export async function listContacts(
  ctx: WorkspaceContext,
  rawQuery: Record<string, string | undefined>
): Promise<ContactListResult> {
  assertPermission(ctx.permissions, PERMISSIONS.MARKETING_READ);
  await ensureIndexes(ctx.db);

  const query = contactQuerySchema.parse(rawQuery);
  const filter: Filter<any> = {
    companyId: ctx.companyId,
    ...(query.active === "all" ? {} : { isActive: query.active === "true" }),
  };

  if (query.lifecycleStage) filter.lifecycleStage = query.lifecycleStage;
  if (query.source) filter.source = query.source;

  if (query.search) {
    const safeSearch = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { firstName: { $regex: safeSearch, $options: "i" } },
      { lastName: { $regex: safeSearch, $options: "i" } },
      { normalizedEmail: { $regex: safeSearch, $options: "i" } },
      { normalizedPhone: { $regex: safeSearch, $options: "i" } },
    ];
  }

  // Filter by tag if requested
  if (query.tagId && ObjectId.isValid(query.tagId)) {
    const assignments = await ctx.db
      .collection(COLLECTIONS.marketingTagAssignments)
      .find({ companyId: ctx.companyId, tagId: new ObjectId(query.tagId) })
      .project({ contactId: 1 })
      .toArray();
    const contactIds = assignments.map((a) => a.contactId);
    filter._id = { $in: contactIds };
  }

  const sort: Sort =
    query.sort === "name"
      ? { firstName: query.direction === "asc" ? 1 : -1, lastName: query.direction === "asc" ? 1 : -1 }
      : { [query.sort]: query.direction === "asc" ? 1 : -1 };

  const [contactDocs, total] = await Promise.all([
    ctx.db
      .collection(COLLECTIONS.marketingContacts)
      .find(filter)
      .sort(sort)
      .skip((query.page - 1) * query.pageSize)
      .limit(query.pageSize)
      .toArray(),
    ctx.db.collection(COLLECTIONS.marketingContacts).countDocuments(filter),
  ]);

  if (contactDocs.length === 0) {
    return { items: [], total, page: query.page, pageSize: query.pageSize };
  }

  // Fetch tag assignments for all returned contacts
  const contactObjIds = contactDocs.map((c) => c._id);
  const assignments = await ctx.db
    .collection(COLLECTIONS.marketingTagAssignments)
    .find({ companyId: ctx.companyId, contactId: { $in: contactObjIds } })
    .toArray();

  const tagObjIds = [...new Set(assignments.map((a) => a.tagId))];
  const tagDocs = tagObjIds.length
    ? await ctx.db
        .collection(COLLECTIONS.marketingTags)
        .find({ companyId: ctx.companyId, _id: { $in: tagObjIds } })
        .toArray()
    : [];

  const tagsById = new Map<string, ContactTag>(
    tagDocs.map((t) => [
      t._id.toHexString(),
      {
        id: t._id.toHexString(),
        name: t.name,
        color: t.color || "#c8f03e",
      },
    ])
  );

  const tagsByContactId = new Map<string, ContactTag[]>();
  for (const assign of assignments) {
    const cId = assign.contactId.toHexString();
    const tag = tagsById.get(assign.tagId.toHexString());
    if (tag) {
      const list = tagsByContactId.get(cId) ?? [];
      list.push(tag);
      tagsByContactId.set(cId, list);
    }
  }

  const items: MarketingContact[] = contactDocs.map((c) => {
    const cId = c._id.toHexString();
    const contactTags = tagsByContactId.get(cId) ?? [];
    return {
      id: cId,
      companyId: c.companyId.toHexString(),
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email || undefined,
      phone: c.phone || undefined,
      source: c.source,
      lifecycleStage: c.lifecycleStage,
      isActive: c.isActive,
      tagIds: contactTags.map((t) => t.id),
      tags: contactTags,
      createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: c.updatedAt ? new Date(c.updatedAt).toISOString() : new Date().toISOString(),
    };
  });

  return { items, total, page: query.page, pageSize: query.pageSize };
}

export async function getContact(ctx: WorkspaceContext, contactId: string): Promise<MarketingContact> {
  assertPermission(ctx.permissions, PERMISSIONS.MARKETING_READ);
  if (!ObjectId.isValid(contactId)) throw new AppError("NOT_FOUND", "Contact not found.");

  const contact = await ctx.db
    .collection(COLLECTIONS.marketingContacts)
    .findOne({ _id: new ObjectId(contactId), companyId: ctx.companyId });

  if (!contact) throw new AppError("NOT_FOUND", "Contact not found.");

  const assignments = await ctx.db
    .collection(COLLECTIONS.marketingTagAssignments)
    .find({ companyId: ctx.companyId, contactId: contact._id })
    .toArray();

  const tagObjIds = assignments.map((a) => a.tagId);
  const tagDocs = tagObjIds.length
    ? await ctx.db
        .collection(COLLECTIONS.marketingTags)
        .find({ companyId: ctx.companyId, _id: { $in: tagObjIds } })
        .toArray()
    : [];

  const tags: ContactTag[] = tagDocs.map((t) => ({
    id: t._id.toHexString(),
    name: t.name,
    color: t.color || "#c8f03e",
  }));

  return {
    id: contact._id.toHexString(),
    companyId: contact.companyId.toHexString(),
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email || undefined,
    phone: contact.phone || undefined,
    source: contact.source,
    lifecycleStage: contact.lifecycleStage,
    isActive: contact.isActive,
    tagIds: tags.map((t) => t.id),
    tags,
    createdAt: contact.createdAt ? new Date(contact.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: contact.updatedAt ? new Date(contact.updatedAt).toISOString() : new Date().toISOString(),
  };
}

export async function createContact(ctx: WorkspaceContext, rawInput: unknown): Promise<MarketingContact> {
  assertPermission(ctx.permissions, PERMISSIONS.MARKETING_CONTACTS_MANAGE);
  await ensureIndexes(ctx.db);

  const input = contactInputSchema.parse(rawInput);
  const normalizedEmail = normalizeEmail(input.email);
  const normalizedPhone = normalizePhone(input.phone);

  if (!normalizedEmail && !normalizedPhone) {
    throw new AppError("VALIDATION_ERROR", "At least an email or phone number is required.");
  }

  // Duplicate identity check within company
  const duplicateQueries: Filter<any>[] = [];
  if (normalizedEmail) duplicateQueries.push({ normalizedEmail });
  if (normalizedPhone) duplicateQueries.push({ normalizedPhone });

  const existing = await ctx.db.collection(COLLECTIONS.marketingContacts).findOne({
    companyId: ctx.companyId,
    $or: duplicateQueries,
  });

  if (existing) {
    throw new AppError("CONFLICT", "A contact with this email or phone number already exists in this company.");
  }

  const now = new Date();
  const contactDoc: Record<string, any> = {
    companyId: ctx.companyId,
    firstName: input.firstName,
    lastName: input.lastName,
    source: input.source,
    lifecycleStage: input.lifecycleStage,
    isActive: true,
    createdByUserId: ctx.userId,
    createdAt: now,
    updatedAt: now,
  };
  if (input.email) contactDoc.email = input.email;
  if (input.phone) contactDoc.phone = input.phone;
  if (normalizedEmail) contactDoc.normalizedEmail = normalizedEmail;
  if (normalizedPhone) contactDoc.normalizedPhone = normalizedPhone;

  const insertResult = await ctx.db.collection(COLLECTIONS.marketingContacts).insertOne(contactDoc);
  const newContactId = insertResult.insertedId;

  // Assign tags if provided
  const validTagIds: ObjectId[] = [];
  if (input.tagIds && input.tagIds.length > 0) {
    const rawTagObjIds = input.tagIds.map((id) => new ObjectId(id));
    const verifiedTags = await ctx.db
      .collection(COLLECTIONS.marketingTags)
      .find({ companyId: ctx.companyId, _id: { $in: rawTagObjIds } })
      .toArray();

    if (verifiedTags.length > 0) {
      const assignmentDocs = verifiedTags.map((t) => ({
        companyId: ctx.companyId,
        contactId: newContactId,
        tagId: t._id,
        assignedAt: now,
        assignedByUserId: ctx.userId,
      }));
      await ctx.db.collection(COLLECTIONS.marketingTagAssignments).insertMany(assignmentDocs, { ordered: false }).catch(() => {});
      validTagIds.push(...verifiedTags.map((t) => t._id));
    }
  }

  await recordAudit(ctx.db, {
    companyId: ctx.companyId,
    actorUserId: ctx.userId,
    action: "marketing.contact.create",
    entityType: "marketing_contact",
    entityId: newContactId.toHexString(),
    requestId: ctx.requestId,
    metadata: { email: input.email ?? "", lifecycleStage: input.lifecycleStage },
  });

  return getContact(ctx, newContactId.toHexString());
}

export async function updateContact(ctx: WorkspaceContext, contactId: string, rawInput: unknown): Promise<MarketingContact> {
  assertPermission(ctx.permissions, PERMISSIONS.MARKETING_CONTACTS_MANAGE);
  if (!ObjectId.isValid(contactId)) throw new AppError("NOT_FOUND", "Contact not found.");
  const contactObjId = new ObjectId(contactId);

  const existing = await ctx.db
    .collection(COLLECTIONS.marketingContacts)
    .findOne({ _id: contactObjId, companyId: ctx.companyId });
  if (!existing) throw new AppError("NOT_FOUND", "Contact not found.");

  const input = contactUpdateSchema.parse(rawInput);
  const updateDoc: Record<string, any> = { updatedAt: new Date() };

  if (input.firstName !== undefined) updateDoc.firstName = input.firstName;
  if (input.lastName !== undefined) updateDoc.lastName = input.lastName;
  if (input.source !== undefined) updateDoc.source = input.source;
  if (input.lifecycleStage !== undefined) updateDoc.lifecycleStage = input.lifecycleStage;
  if (input.isActive !== undefined) updateDoc.isActive = input.isActive;

  if (input.email !== undefined) {
    const norm = normalizeEmail(input.email);
    if (norm) {
      const dup = await ctx.db.collection(COLLECTIONS.marketingContacts).findOne({
        companyId: ctx.companyId,
        _id: { $ne: contactObjId },
        normalizedEmail: norm,
      });
      if (dup) throw new AppError("CONFLICT", "Another contact has this email address.");
      updateDoc.email = input.email;
      updateDoc.normalizedEmail = norm;
    } else {
      updateDoc.email = null;
      updateDoc.normalizedEmail = null;
    }
  }

  if (input.phone !== undefined) {
    const norm = normalizePhone(input.phone);
    if (norm) {
      const dup = await ctx.db.collection(COLLECTIONS.marketingContacts).findOne({
        companyId: ctx.companyId,
        _id: { $ne: contactObjId },
        normalizedPhone: norm,
      });
      if (dup) throw new AppError("CONFLICT", "Another contact has this phone number.");
      updateDoc.phone = input.phone;
      updateDoc.normalizedPhone = norm;
    } else {
      updateDoc.phone = null;
      updateDoc.normalizedPhone = null;
    }
  }

  // Update tag assignments if tagIds were supplied
  if (input.tagIds !== undefined) {
    const requestedTagObjIds = input.tagIds.map((id) => new ObjectId(id));
    const validTags = requestedTagObjIds.length
      ? await ctx.db
          .collection(COLLECTIONS.marketingTags)
          .find({ companyId: ctx.companyId, _id: { $in: requestedTagObjIds } })
          .toArray()
      : [];

    await ctx.db.collection(COLLECTIONS.marketingTagAssignments).deleteMany({
      companyId: ctx.companyId,
      contactId: contactObjId,
    });

    if (validTags.length > 0) {
      const now = new Date();
      await ctx.db.collection(COLLECTIONS.marketingTagAssignments).insertMany(
        validTags.map((t) => ({
          companyId: ctx.companyId,
          contactId: contactObjId,
          tagId: t._id,
          assignedAt: now,
          assignedByUserId: ctx.userId,
        })),
        { ordered: false }
      ).catch(() => {});
    }
  }

  await ctx.db.collection(COLLECTIONS.marketingContacts).updateOne(
    { _id: contactObjId, companyId: ctx.companyId },
    { $set: updateDoc }
  );

  await recordAudit(ctx.db, {
    companyId: ctx.companyId,
    actorUserId: ctx.userId,
    action: "marketing.contact.update",
    entityType: "marketing_contact",
    entityId: contactId,
    requestId: ctx.requestId,
  });

  return getContact(ctx, contactId);
}

export async function archiveContact(ctx: WorkspaceContext, contactId: string): Promise<boolean> {
  assertPermission(ctx.permissions, PERMISSIONS.MARKETING_CONTACTS_MANAGE);
  if (!ObjectId.isValid(contactId)) {
    throw new AppError("NOT_FOUND", "Contact not found.");
  }

  const result = await ctx.db.collection(COLLECTIONS.marketingContacts).updateOne(
    { _id: new ObjectId(contactId), companyId: ctx.companyId },
    { $set: { isActive: false, updatedAt: new Date() } }
  );

  if (result.matchedCount === 0) {
    throw new AppError("NOT_FOUND", "Contact not found.");
  }

  if (result.modifiedCount > 0) {
    await recordAudit(ctx.db, {
      companyId: ctx.companyId,
      actorUserId: ctx.userId,
      action: "marketing.contact.archive",
      entityType: "marketing_contact",
      entityId: contactId,
      requestId: ctx.requestId,
    });
  }
  return true;
}

export async function restoreContact(ctx: WorkspaceContext, contactId: string): Promise<boolean> {
  assertPermission(ctx.permissions, PERMISSIONS.MARKETING_CONTACTS_MANAGE);
  if (!ObjectId.isValid(contactId)) return false;

  const result = await ctx.db.collection(COLLECTIONS.marketingContacts).updateOne(
    { _id: new ObjectId(contactId), companyId: ctx.companyId },
    { $set: { isActive: true, updatedAt: new Date() } }
  );

  if (result.modifiedCount > 0) {
    await recordAudit(ctx.db, {
      companyId: ctx.companyId,
      actorUserId: ctx.userId,
      action: "marketing.contact.restore",
      entityType: "marketing_contact",
      entityId: contactId,
      requestId: ctx.requestId,
    });
    return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. TAGS MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export async function listTags(ctx: WorkspaceContext): Promise<ContactTag[]> {
  assertPermission(ctx.permissions, PERMISSIONS.MARKETING_READ);
  await ensureIndexes(ctx.db);

  const tags = await ctx.db
    .collection(COLLECTIONS.marketingTags)
    .find({ companyId: ctx.companyId })
    .sort({ name: 1 })
    .toArray();

  const counts = await ctx.db
    .collection(COLLECTIONS.marketingTagAssignments)
    .aggregate([
      { $match: { companyId: ctx.companyId } },
      { $group: { _id: "$tagId", count: { $sum: 1 } } },
    ])
    .toArray();

  const countMap = new Map(counts.map((c) => [c._id.toHexString(), c.count]));

  return tags.map((t) => ({
    id: t._id.toHexString(),
    name: t.name,
    color: t.color || "#c8f03e",
    contactCount: countMap.get(t._id.toHexString()) ?? 0,
    createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : undefined,
    updatedAt: t.updatedAt ? new Date(t.updatedAt).toISOString() : undefined,
  }));
}

export async function createTag(ctx: WorkspaceContext, rawInput: unknown): Promise<ContactTag> {
  assertPermission(ctx.permissions, PERMISSIONS.MARKETING_TAGS_MANAGE);
  await ensureIndexes(ctx.db);

  const input = tagInputSchema.parse(rawInput);
  const normalizedName = normalizeTagName(input.name);

  const existing = await ctx.db
    .collection(COLLECTIONS.marketingTags)
    .findOne({ companyId: ctx.companyId, normalizedName });

  if (existing) {
    throw new AppError("CONFLICT", "A tag with this name already exists.");
  }

  const now = new Date();
  const doc = {
    companyId: ctx.companyId,
    name: input.name.trim(),
    normalizedName,
    color: input.color,
    createdByUserId: ctx.userId,
    createdAt: now,
    updatedAt: now,
  };

  const result = await ctx.db.collection(COLLECTIONS.marketingTags).insertOne(doc);
  return {
    id: result.insertedId.toHexString(),
    name: doc.name,
    color: doc.color,
    contactCount: 0,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export async function deleteTag(ctx: WorkspaceContext, tagId: string): Promise<boolean> {
  assertPermission(ctx.permissions, PERMISSIONS.MARKETING_TAGS_MANAGE);
  if (!ObjectId.isValid(tagId)) return false;
  const tagObjId = new ObjectId(tagId);

  const deleteResult = await ctx.db.collection(COLLECTIONS.marketingTags).deleteOne({
    _id: tagObjId,
    companyId: ctx.companyId,
  });

  if (deleteResult.deletedCount > 0) {
    await ctx.db.collection(COLLECTIONS.marketingTagAssignments).deleteMany({
      tagId: tagObjId,
      companyId: ctx.companyId,
    });
    return true;
  }

  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. CONSENT & SUPPRESSION
// ─────────────────────────────────────────────────────────────────────────────

export async function recordConsent(
  ctx: WorkspaceContext,
  contactId: string,
  rawInput: unknown
): Promise<ConsentRecord> {
  assertPermission(ctx.permissions, PERMISSIONS.MARKETING_CONSENT_MANAGE);
  if (!ObjectId.isValid(contactId)) throw new AppError("NOT_FOUND", "Contact not found.");
  const contactObjId = new ObjectId(contactId);

  const contact = await ctx.db
    .collection(COLLECTIONS.marketingContacts)
    .findOne({ _id: contactObjId, companyId: ctx.companyId });
  if (!contact) throw new AppError("NOT_FOUND", "Contact not found.");

  const input = consentRecordSchema.parse(rawInput);
  const now = new Date();

  const doc = {
    companyId: ctx.companyId,
    contactId: contactObjId,
    channel: input.channel,
    purpose: input.purpose.trim(),
    status: input.status,
    source: input.source.trim(),
    recordedByUserId: ctx.userId,
    recordedAt: now,
    withdrawnAt: input.status === "revoked" ? now : undefined,
  };

  const result = await ctx.db.collection(COLLECTIONS.marketingConsents).insertOne(doc);

  await recordAudit(ctx.db, {
    companyId: ctx.companyId,
    actorUserId: ctx.userId,
    action: `marketing.consent.${input.status}`,
    entityType: "marketing_consent",
    entityId: result.insertedId.toHexString(),
    requestId: ctx.requestId,
    metadata: { contactId, channel: input.channel, purpose: input.purpose, status: input.status },
  });

  return {
    id: result.insertedId.toHexString(),
    companyId: ctx.companyId.toHexString(),
    contactId,
    channel: input.channel,
    purpose: input.purpose,
    status: input.status,
    source: input.source,
    recordedAt: now.toISOString(),
    withdrawnAt: doc.withdrawnAt ? doc.withdrawnAt.toISOString() : undefined,
    recordedByUserId: ctx.userId.toHexString(),
  };
}

export async function listConsentHistory(
  ctx: WorkspaceContext,
  contactId: string
): Promise<ConsentRecord[]> {
  assertPermission(ctx.permissions, PERMISSIONS.MARKETING_READ);
  if (!ObjectId.isValid(contactId)) return [];

  const history = await ctx.db
    .collection(COLLECTIONS.marketingConsents)
    .find({ companyId: ctx.companyId, contactId: new ObjectId(contactId) })
    .sort({ recordedAt: -1 })
    .toArray();

  return history.map((c) => ({
    id: c._id.toHexString(),
    companyId: c.companyId.toHexString(),
    contactId: c.contactId.toHexString(),
    channel: c.channel,
    purpose: c.purpose,
    status: c.status,
    source: c.source,
    recordedAt: c.recordedAt.toISOString(),
    withdrawnAt: c.withdrawnAt ? c.withdrawnAt.toISOString() : undefined,
    recordedByUserId: c.recordedByUserId ? c.recordedByUserId.toHexString() : undefined,
  }));
}

export async function isRecipientSuppressed(
  db: Db,
  companyId: ObjectId,
  contactId: ObjectId,
  channel: "email" | "sms"
): Promise<boolean> {
  // Check latest consent for channel
  const latestConsent = await db
    .collection(COLLECTIONS.marketingConsents)
    .find({ companyId, contactId, channel })
    .sort({ recordedAt: -1 })
    .limit(1)
    .toArray();

  if (latestConsent.length === 0) return true; // Missing consent suppresses delivery
  if (latestConsent[0].status === "revoked") return true; // Revoked consent suppresses delivery
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. AUDIENCES & MEMBERSHIP
// ─────────────────────────────────────────────────────────────────────────────

export async function listAudiences(ctx: WorkspaceContext): Promise<Audience[]> {
  assertPermission(ctx.permissions, PERMISSIONS.MARKETING_READ);
  await ensureIndexes(ctx.db);

  const audiences = await ctx.db
    .collection(COLLECTIONS.marketingAudiences)
    .find({ companyId: ctx.companyId })
    .sort({ updatedAt: -1 })
    .limit(100)
    .toArray();

  return Promise.all(
    audiences.map(async (aud) => {
      const counts = await getAudienceCounts(ctx.db, ctx.companyId, aud._id, aud.selectionRule);
      return {
        id: aud._id.toHexString(),
        companyId: aud.companyId.toHexString(),
        name: aud.name,
        description: aud.description || "",
        selectionRule: aud.selectionRule,
        isActive: aud.isActive ?? true,
        memberCount: counts.memberCount,
        eligibleCount: counts.eligibleCount,
        createdAt: aud.createdAt ? new Date(aud.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: aud.updatedAt ? new Date(aud.updatedAt).toISOString() : new Date().toISOString(),
      };
    })
  );
}

export async function getAudience(ctx: WorkspaceContext, audienceId: string): Promise<Audience> {
  assertPermission(ctx.permissions, PERMISSIONS.MARKETING_READ);
  if (!ObjectId.isValid(audienceId)) throw new AppError("NOT_FOUND", "Audience not found.");

  const aud = await ctx.db
    .collection(COLLECTIONS.marketingAudiences)
    .findOne({ _id: new ObjectId(audienceId), companyId: ctx.companyId });
  if (!aud) throw new AppError("NOT_FOUND", "Audience not found.");

  const counts = await getAudienceCounts(ctx.db, ctx.companyId, aud._id, aud.selectionRule);
  return {
    id: aud._id.toHexString(),
    companyId: aud.companyId.toHexString(),
    name: aud.name,
    description: aud.description || "",
    selectionRule: aud.selectionRule,
    isActive: aud.isActive ?? true,
    memberCount: counts.memberCount,
    eligibleCount: counts.eligibleCount,
    createdAt: aud.createdAt ? new Date(aud.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: aud.updatedAt ? new Date(aud.updatedAt).toISOString() : new Date().toISOString(),
  };
}

async function getAudienceCounts(
  db: Db,
  companyId: ObjectId,
  audienceId: ObjectId,
  rule?: any
): Promise<{ memberCount: number; eligibleCount: number }> {
  // If rule-based, calculate dynamically; otherwise count manual members
  if (rule) {
    const contactFilter = buildRuleQuery(companyId, rule);
    const memberCount = await db.collection(COLLECTIONS.marketingContacts).countDocuments(contactFilter);

    // Eligible for email: active + granted consent
    const eligibleCount = await db.collection(COLLECTIONS.marketingContacts).aggregate([
      { $match: contactFilter },
      {
        $lookup: {
          from: COLLECTIONS.marketingConsents,
          let: { cId: "$_id", compId: "$companyId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$contactId", "$$cId"] },
                    { $eq: ["$companyId", "$$compId"] },
                    { $eq: ["$channel", "email"] },
                    { $eq: ["$status", "granted"] },
                  ],
                },
              },
            },
            { $sort: { recordedAt: -1 } },
            { $limit: 1 },
          ],
          as: "consents",
        },
      },
      { $match: { "consents.0": { $exists: true } } },
      { $count: "count" },
    ]).toArray().then((r) => r[0]?.count ?? 0);

    return { memberCount, eligibleCount };
  }

  const memberCount = await db
    .collection(COLLECTIONS.marketingAudienceMembers)
    .countDocuments({ companyId, audienceId });

  const eligibleCount = await db.collection(COLLECTIONS.marketingAudienceMembers).aggregate([
    { $match: { companyId, audienceId } },
    {
      $lookup: {
        from: COLLECTIONS.marketingContacts,
        let: { contactId: "$contactId", companyId: "$companyId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ["$_id", "$$contactId"] }, { $eq: ["$companyId", "$$companyId"] }],
              },
            },
          },
        ],
        as: "contact",
      },
    },
    { $unwind: "$contact" },
    { $match: { "contact.isActive": true } },
    {
      $lookup: {
        from: COLLECTIONS.marketingConsents,
        let: { contactId: "$contactId", companyId: "$companyId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$contactId", "$$contactId"] },
                  { $eq: ["$companyId", "$$companyId"] },
                  { $eq: ["$channel", "email"] },
                  { $eq: ["$status", "granted"] },
                ],
              },
            },
          },
        ],
        as: "consent",
      },
    },
    { $match: { consent: { $ne: [] } } },
    { $count: "count" },
  ]).toArray().then((r) => r[0]?.count ?? 0);

  return { memberCount, eligibleCount };
}

function buildRuleQuery(companyId: ObjectId, rule: any): Filter<any> {
  const filter: Filter<any> = { companyId };
  if (rule.activeOnly !== false) {
    filter.isActive = true;
  }
  if (rule.lifecycleStages && rule.lifecycleStages.length > 0) {
    filter.lifecycleStage = { $in: rule.lifecycleStages };
  }
  if (rule.sources && rule.sources.length > 0) {
    filter.source = { $in: rule.sources };
  }
  return filter;
}

export async function createAudience(ctx: WorkspaceContext, rawInput: unknown): Promise<Audience> {
  assertPermission(ctx.permissions, PERMISSIONS.MARKETING_AUDIENCES_MANAGE);
  await ensureIndexes(ctx.db);

  const input = audienceInputSchema.parse(rawInput);
  const now = new Date();

  const doc = {
    companyId: ctx.companyId,
    name: input.name.trim(),
    description: input.description.trim(),
    selectionRule: input.selectionRule,
    isActive: true,
    createdByUserId: ctx.userId,
    createdAt: now,
    updatedAt: now,
  };

  const result = await ctx.db.collection(COLLECTIONS.marketingAudiences).insertOne(doc);

  await recordAudit(ctx.db, {
    companyId: ctx.companyId,
    actorUserId: ctx.userId,
    action: "marketing.audience.create",
    entityType: "marketing_audience",
    entityId: result.insertedId.toHexString(),
    requestId: ctx.requestId,
    metadata: { name: doc.name },
  });

  return getAudience(ctx, result.insertedId.toHexString());
}

export async function addAudienceMember(
  ctx: WorkspaceContext,
  audienceId: string,
  contactId: string
): Promise<boolean> {
  assertPermission(ctx.permissions, PERMISSIONS.MARKETING_AUDIENCES_MANAGE);
  if (!ObjectId.isValid(audienceId) || !ObjectId.isValid(contactId)) {
    throw new AppError("NOT_FOUND", "Audience or contact not found.");
  }

  const [aud, contact] = await Promise.all([
    ctx.db.collection(COLLECTIONS.marketingAudiences).findOne({ _id: new ObjectId(audienceId), companyId: ctx.companyId }),
    ctx.db.collection(COLLECTIONS.marketingContacts).findOne({ _id: new ObjectId(contactId), companyId: ctx.companyId }),
  ]);

  if (!aud || !contact) throw new AppError("NOT_FOUND", "Audience or contact not found in this company.");

  try {
    await ctx.db.collection(COLLECTIONS.marketingAudienceMembers).insertOne({
      companyId: ctx.companyId,
      audienceId: aud._id,
      contactId: contact._id,
      addedAt: new Date(),
      addedByUserId: ctx.userId,
    });
    return true;
  } catch (err: any) {
    if (err?.message?.includes("duplicate")) {
      return true; // Idempotent add
    }
    throw err;
  }
}

export async function removeAudienceMember(
  ctx: WorkspaceContext,
  audienceId: string,
  contactId: string
): Promise<boolean> {
  assertPermission(ctx.permissions, PERMISSIONS.MARKETING_AUDIENCES_MANAGE);
  if (!ObjectId.isValid(audienceId) || !ObjectId.isValid(contactId)) return false;

  const result = await ctx.db.collection(COLLECTIONS.marketingAudienceMembers).deleteOne({
    companyId: ctx.companyId,
    audienceId: new ObjectId(audienceId),
    contactId: new ObjectId(contactId),
  });

  return result.deletedCount > 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. TEMPLATES & VERSIONING
// ─────────────────────────────────────────────────────────────────────────────

export async function listTemplates(ctx: WorkspaceContext, search = ""): Promise<CampaignTemplate[]> {
  assertPermission(ctx.permissions, PERMISSIONS.MARKETING_READ);
  await ensureIndexes(ctx.db);

  const filter: Filter<any> = { companyId: ctx.companyId, archived: false };
  if (search.trim()) {
    filter.name = { $regex: search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  }

  const docs = await ctx.db
    .collection(COLLECTIONS.marketingTemplates)
    .find(filter)
    .sort({ updatedAt: -1 })
    .limit(100)
    .toArray();

  return docs.map((doc) => ({
    id: doc._id.toHexString(),
    companyId: doc.companyId.toHexString(),
    name: doc.name,
    description: doc.description || "",
    channel: doc.channel,
    subject: doc.subject,
    body: doc.body,
    version: doc.version ?? 1,
    archived: doc.archived ?? false,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
  }));
}

export async function getTemplate(ctx: WorkspaceContext, id: string): Promise<CampaignTemplate> {
  assertPermission(ctx.permissions, PERMISSIONS.MARKETING_READ);
  if (!ObjectId.isValid(id)) throw new AppError("NOT_FOUND", "Template not found.");

  const doc = await ctx.db
    .collection(COLLECTIONS.marketingTemplates)
    .findOne({ _id: new ObjectId(id), companyId: ctx.companyId });
  if (!doc) throw new AppError("NOT_FOUND", "Template not found.");

  return {
    id: doc._id.toHexString(),
    companyId: doc.companyId.toHexString(),
    name: doc.name,
    description: doc.description || "",
    channel: doc.channel,
    subject: doc.subject,
    body: doc.body,
    version: doc.version ?? 1,
    archived: doc.archived ?? false,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
  };
}

export async function createTemplate(ctx: WorkspaceContext, rawInput: unknown): Promise<CampaignTemplate> {
  assertPermission(ctx.permissions, PERMISSIONS.MARKETING_TEMPLATES_MANAGE);
  await ensureIndexes(ctx.db);

  const input = templateInputSchema.parse(rawInput);
  const now = new Date();

  const doc = {
    companyId: ctx.companyId,
    name: input.name.trim(),
    description: input.description.trim(),
    channel: input.channel,
    subject: input.subject || undefined,
    body: input.body,
    version: 1,
    archived: false,
    createdByUserId: ctx.userId,
    createdAt: now,
    updatedAt: now,
  };

  const result = await ctx.db.collection(COLLECTIONS.marketingTemplates).insertOne(doc);

  await recordAudit(ctx.db, {
    companyId: ctx.companyId,
    actorUserId: ctx.userId,
    action: "marketing.template.create",
    entityType: "marketing_template",
    entityId: result.insertedId.toHexString(),
    requestId: ctx.requestId,
    metadata: { name: doc.name, channel: doc.channel },
  });

  return getTemplate(ctx, result.insertedId.toHexString());
}

export async function updateTemplate(ctx: WorkspaceContext, id: string, rawInput: unknown): Promise<CampaignTemplate> {
  assertPermission(ctx.permissions, PERMISSIONS.MARKETING_TEMPLATES_MANAGE);
  if (!ObjectId.isValid(id)) throw new AppError("NOT_FOUND", "Template not found.");
  const templateObjId = new ObjectId(id);

  const current = await ctx.db
    .collection(COLLECTIONS.marketingTemplates)
    .findOne({ _id: templateObjId, companyId: ctx.companyId, archived: false });
  if (!current) throw new AppError("NOT_FOUND", "Template not found.");

  const input = templateInputSchema.parse(rawInput);
  const nextVersion = (current.version ?? 1) + 1;
  const now = new Date();

  await ctx.db.collection(COLLECTIONS.marketingTemplates).updateOne(
    { _id: templateObjId, companyId: ctx.companyId },
    {
      $set: {
        name: input.name.trim(),
        description: input.description.trim(),
        channel: input.channel,
        subject: input.subject || undefined,
        body: input.body,
        version: nextVersion,
        updatedAt: now,
      },
    }
  );

  await recordAudit(ctx.db, {
    companyId: ctx.companyId,
    actorUserId: ctx.userId,
    action: "marketing.template.update_version",
    entityType: "marketing_template",
    entityId: id,
    requestId: ctx.requestId,
    metadata: { version: nextVersion },
  });

  return getTemplate(ctx, id);
}

export async function archiveTemplate(ctx: WorkspaceContext, id: string): Promise<boolean> {
  assertPermission(ctx.permissions, PERMISSIONS.MARKETING_TEMPLATES_MANAGE);
  if (!ObjectId.isValid(id)) return false;

  const result = await ctx.db.collection(COLLECTIONS.marketingTemplates).updateOne(
    { _id: new ObjectId(id), companyId: ctx.companyId, archived: false },
    { $set: { archived: true, updatedAt: new Date() } }
  );

  return result.modifiedCount > 0;
}

export async function duplicateTemplate(ctx: WorkspaceContext, id: string): Promise<CampaignTemplate> {
  const source = await getTemplate(ctx, id);
  return createTemplate(ctx, {
    name: `${source.name} (Copy)`,
    description: source.description,
    channel: source.channel,
    subject: source.subject ?? "",
    body: source.body,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. CAMPAIGN LIFECYCLE & STATE TRANSITIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function listCampaigns(ctx: WorkspaceContext): Promise<MarketingCampaign[]> {
  assertPermission(ctx.permissions, PERMISSIONS.MARKETING_READ);
  await ensureIndexes(ctx.db);

  const docs = await ctx.db
    .collection(COLLECTIONS.marketingCampaigns)
    .find({ companyId: ctx.companyId })
    .sort({ updatedAt: -1 })
    .limit(100)
    .toArray();

  return docs.map((doc) => mapCampaign(doc));
}

export async function getCampaign(ctx: WorkspaceContext, campaignId: string): Promise<MarketingCampaign> {
  assertPermission(ctx.permissions, PERMISSIONS.MARKETING_READ);
  if (!ObjectId.isValid(campaignId)) throw new AppError("NOT_FOUND", "Campaign not found.");

  const doc = await ctx.db
    .collection(COLLECTIONS.marketingCampaigns)
    .findOne({ _id: new ObjectId(campaignId), companyId: ctx.companyId });
  if (!doc) throw new AppError("NOT_FOUND", "Campaign not found.");

  return mapCampaign(doc);
}

function mapCampaign(doc: any): MarketingCampaign {
  return {
    id: doc._id.toHexString(),
    companyId: doc.companyId.toHexString(),
    name: doc.name,
    channel: doc.channel,
    subject: doc.subject,
    body: doc.body,
    audienceId: doc.audienceId ? doc.audienceId.toHexString() : "",
    templateId: doc.templateId ? doc.templateId.toHexString() : undefined,
    status: doc.status,
    scheduledAt: doc.scheduledAt ? new Date(doc.scheduledAt).toISOString() : undefined,
    startedAt: doc.startedAt ? new Date(doc.startedAt).toISOString() : undefined,
    completedAt: doc.completedAt ? new Date(doc.completedAt).toISOString() : undefined,
    approvedAt: doc.approvedAt ? new Date(doc.approvedAt).toISOString() : undefined,
    approvedByUserId: doc.approvedByUserId ? doc.approvedByUserId.toHexString() : undefined,
    createdByUserId: doc.createdByUserId ? doc.createdByUserId.toHexString() : "",
    snapshot: doc.snapshot,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
  };
}

export async function createCampaign(ctx: WorkspaceContext, rawInput: unknown): Promise<MarketingCampaign> {
  assertPermission(ctx.permissions, PERMISSIONS.MARKETING_CAMPAIGNS_MANAGE);
  await ensureIndexes(ctx.db);

  const input = campaignInputSchema.parse(rawInput);
  const audience = await ctx.db.collection(COLLECTIONS.marketingAudiences).findOne({
    _id: new ObjectId(input.audienceId),
    companyId: ctx.companyId,
    isActive: true,
  });
  if (!audience) throw new AppError("NOT_FOUND", "Active audience not found in this company.");

  const now = new Date();
  const doc = {
    companyId: ctx.companyId,
    name: input.name.trim(),
    channel: input.channel,
    subject: input.subject || undefined,
    body: input.body,
    audienceId: audience._id,
    templateId: input.templateId ? new ObjectId(input.templateId) : undefined,
    status: "draft" as CampaignStatus,
    scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
    createdByUserId: ctx.userId,
    createdAt: now,
    updatedAt: now,
  };

  const result = await ctx.db.collection(COLLECTIONS.marketingCampaigns).insertOne(doc);

  await recordAudit(ctx.db, {
    companyId: ctx.companyId,
    actorUserId: ctx.userId,
    action: "marketing.campaign.create",
    entityType: "marketing_campaign",
    entityId: result.insertedId.toHexString(),
    requestId: ctx.requestId,
    metadata: { name: doc.name, channel: doc.channel },
  });

  return getCampaign(ctx, result.insertedId.toHexString());
}

export async function updateCampaign(
  ctx: WorkspaceContext,
  campaignId: string,
  rawInput: unknown
): Promise<MarketingCampaign> {
  assertPermission(ctx.permissions, PERMISSIONS.MARKETING_CAMPAIGNS_MANAGE);
  if (!ObjectId.isValid(campaignId)) throw new AppError("NOT_FOUND", "Campaign not found.");
  const campObjId = new ObjectId(campaignId);

  const current = await ctx.db
    .collection(COLLECTIONS.marketingCampaigns)
    .findOne({ _id: campObjId, companyId: ctx.companyId });
  if (!current) throw new AppError("NOT_FOUND", "Campaign not found.");
  if (current.status !== "draft") throw new AppError("CONFLICT", "Only draft campaigns can be edited.");

  const input = campaignInputSchema.parse(rawInput);
  const audience = await ctx.db.collection(COLLECTIONS.marketingAudiences).findOne({
    _id: new ObjectId(input.audienceId),
    companyId: ctx.companyId,
    isActive: true,
  });
  if (!audience) throw new AppError("NOT_FOUND", "Active audience not found in this company.");

  await ctx.db.collection(COLLECTIONS.marketingCampaigns).updateOne(
    { _id: campObjId, companyId: ctx.companyId },
    {
      $set: {
        name: input.name.trim(),
        channel: input.channel,
        subject: input.subject || undefined,
        body: input.body,
        audienceId: audience._id,
        templateId: input.templateId ? new ObjectId(input.templateId) : undefined,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
        updatedAt: new Date(),
      },
    }
  );

  return getCampaign(ctx, campaignId);
}

export async function duplicateCampaign(ctx: WorkspaceContext, campaignId: string): Promise<MarketingCampaign> {
  const current = await getCampaign(ctx, campaignId);
  return createCampaign(ctx, {
    name: `${current.name} (Copy)`,
    channel: current.channel,
    subject: current.subject ?? "",
    body: current.body,
    audienceId: current.audienceId,
  });
}

const VALID_TRANSITIONS: Record<string, CampaignStatus[]> = {
  submit: ["draft"],
  approve: ["pending_approval"],
  reject: ["pending_approval"],
  schedule: ["approved"],
  dispatch: ["approved", "scheduled"],
  cancel: ["pending_approval", "approved", "scheduled"],
  retry: ["failed"],
};

export async function transitionCampaign(
  ctx: WorkspaceContext,
  campaignId: string,
  command: keyof typeof VALID_TRANSITIONS
): Promise<CampaignStatus> {
  if (!ObjectId.isValid(campaignId) || !VALID_TRANSITIONS[command]) {
    throw new AppError("VALIDATION_ERROR", "Invalid campaign command or ID.");
  }
  const campObjId = new ObjectId(campaignId);

  // RBAC checks for high-impact commands
  if (command === "approve" || command === "reject") {
    assertPermission(ctx.permissions, PERMISSIONS.MARKETING_CAMPAIGNS_APPROVE);
  } else if (command === "dispatch") {
    assertPermission(ctx.permissions, PERMISSIONS.MARKETING_CAMPAIGNS_DISPATCH);
  } else {
    assertPermission(ctx.permissions, PERMISSIONS.MARKETING_CAMPAIGNS_MANAGE);
  }

  const campaign = await ctx.db
    .collection(COLLECTIONS.marketingCampaigns)
    .findOne({ _id: campObjId, companyId: ctx.companyId });
  if (!campaign) throw new AppError("NOT_FOUND", "Campaign not found.");

  if (!VALID_TRANSITIONS[command].includes(campaign.status)) {
    throw new AppError(
      "CONFLICT",
      `Cannot execute '${command}' on campaign in status '${campaign.status}'.`
    );
  }

  let nextStatus: CampaignStatus;
  const updateSet: Record<string, any> = { updatedAt: new Date() };

  if (command === "submit") {
    nextStatus = "pending_approval";
  } else if (command === "approve") {
    nextStatus = "approved";
    updateSet.approvedAt = new Date();
    updateSet.approvedByUserId = ctx.userId;

    // Snapshot recipients & template content immutably
    const aud = await ctx.db
      .collection(COLLECTIONS.marketingAudiences)
      .findOne({ _id: campaign.audienceId, companyId: ctx.companyId });

    const counts = aud
      ? await getAudienceCounts(ctx.db, ctx.companyId, aud._id, aud.selectionRule)
      : { memberCount: 0, eligibleCount: 0 };

    updateSet.snapshot = {
      subject: campaign.subject,
      body: campaign.body,
      recipientCount: counts.memberCount,
      snapshotAt: new Date().toISOString(),
    };
  } else if (command === "reject") {
    nextStatus = "draft";
  } else if (command === "schedule") {
    if (!campaign.scheduledAt || new Date(campaign.scheduledAt).getTime() <= Date.now()) {
      throw new AppError("VALIDATION_ERROR", "A future scheduled date/time is required to schedule a campaign.");
    }
    nextStatus = "scheduled";
  } else if (command === "dispatch") {
    nextStatus = "running";
    updateSet.startedAt = new Date();
  } else if (command === "cancel") {
    nextStatus = "cancelled";
  } else if (command === "retry") {
    nextStatus = "approved";
  } else {
    nextStatus = campaign.status;
  }

  updateSet.status = nextStatus;

  const result = await ctx.db.collection(COLLECTIONS.marketingCampaigns).updateOne(
    { _id: campObjId, companyId: ctx.companyId, status: campaign.status },
    { $set: updateSet }
  );

  if (result.modifiedCount !== 1) {
    throw new AppError("CONFLICT", "Concurrent update detected. Please reload and try again.");
  }

  await recordAudit(ctx.db, {
    companyId: ctx.companyId,
    actorUserId: ctx.userId,
    action: `marketing.campaign.${command}`,
    entityType: "marketing_campaign",
    entityId: campaignId,
    requestId: ctx.requestId,
    metadata: { previousStatus: campaign.status, newStatus: nextStatus },
  });

  return nextStatus;
}
