import "server-only";

import { ObjectId, type Db, type Filter } from "mongodb";
import { COLLECTIONS } from "@/server/db/documents";
import { ensureIndexes } from "@/server/db/indexes";
import type { WorkspaceContext } from "@/server/tenancy/workspace";
import { assertPermission, PERMISSIONS } from "@/server/security/permissions";
import { recordAudit } from "@/server/audit/audit.service";
import { AppError } from "@/shared/lib/errors";
import { getDeliveryProvider, type DeliveryChannel } from "@/server/marketing/delivery-provider";
import { nextDeliveryStatus, type NormalizedDeliveryEvent } from "./delivery-events";
import type { CampaignDelivery, DeliveryStatus } from "@/features/marketing/types";

export const WORKER_DEFAULTS = {
  batchSize: 20,
  leaseMs: 120_000,
  maxAttempts: 3,
  baseBackoffMs: 30_000,
  maxBackoffMs: 900_000,
};

export function retryDelay(
  attempt: number,
  base = WORKER_DEFAULTS.baseBackoffMs,
  max = WORKER_DEFAULTS.maxBackoffMs
): number {
  return Math.min(max, base * 2 ** Math.max(0, attempt - 1));
}

/**
 * Enqueues delivery records for all eligible audience members of an approved campaign.
 * Pre-evaluates consent and suppression, and generates stable idempotency keys.
 */
export async function enqueueCampaignDeliveries(
  ctx: WorkspaceContext,
  campaignId: string
): Promise<{ queued: number; providerConfigured: boolean }> {
  assertPermission(ctx.permissions, PERMISSIONS.MARKETING_CAMPAIGNS_DISPATCH);
  if (!ObjectId.isValid(campaignId)) throw new AppError("NOT_FOUND", "Campaign not found.");
  const campObjId = new ObjectId(campaignId);

  await ensureIndexes(ctx.db);

  const campaign = await ctx.db
    .collection(COLLECTIONS.marketingCampaigns)
    .findOne({ _id: campObjId, companyId: ctx.companyId, status: { $in: ["approved", "scheduled", "running"] } });
  if (!campaign) throw new AppError("CONFLICT", "Campaign is not in an approved, scheduled, or running status.");

  // Fetch audience members
  let contactIds: ObjectId[] = [];
  const aud = await ctx.db
    .collection(COLLECTIONS.marketingAudiences)
    .findOne({ _id: campaign.audienceId, companyId: ctx.companyId });

  if (aud?.selectionRule) {
    const filter: Filter<any> = { companyId: ctx.companyId };
    if (aud.selectionRule.activeOnly !== false) filter.isActive = true;
    if (aud.selectionRule.lifecycleStages?.length) filter.lifecycleStage = { $in: aud.selectionRule.lifecycleStages };
    if (aud.selectionRule.sources?.length) filter.source = { $in: aud.selectionRule.sources };
    const docs = await ctx.db.collection(COLLECTIONS.marketingContacts).find(filter).project({ _id: 1 }).toArray();
    contactIds = docs.map((d) => d._id);
  } else {
    const members = await ctx.db
      .collection(COLLECTIONS.marketingAudienceMembers)
      .find({ companyId: ctx.companyId, audienceId: campaign.audienceId })
      .project({ contactId: 1 })
      .toArray();
    contactIds = members.map((m) => m.contactId);
  }

  if (contactIds.length === 0) {
    return { queued: 0, providerConfigured: getDeliveryProvider(campaign.channel as DeliveryChannel).configured };
  }

  // De-duplicate contacts
  const uniqueContactIds = [...new Set(contactIds.map((id) => id.toHexString()))].map((id) => new ObjectId(id));

  const contacts = await ctx.db
    .collection(COLLECTIONS.marketingContacts)
    .find({ companyId: ctx.companyId, _id: { $in: uniqueContactIds }, isActive: true })
    .toArray();

  const now = new Date();
  const deliveryDocs: any[] = [];

  for (const contact of contacts) {
    const destination = campaign.channel === "email" ? contact.email?.trim() : contact.phone?.trim();
    if (!destination) continue;

    // Consent check
    const consent = await ctx.db
      .collection(COLLECTIONS.marketingConsents)
      .find({ companyId: ctx.companyId, contactId: contact._id, channel: campaign.channel })
      .sort({ recordedAt: -1 })
      .limit(1)
      .toArray();

    const isSuppressed = consent.length === 0 || consent[0].status === "revoked";

    deliveryDocs.push({
      companyId: ctx.companyId,
      campaignId: campObjId,
      contactId: contact._id,
      channel: campaign.channel,
      destination,
      recipientName: `${contact.firstName} ${contact.lastName}`.trim(),
      status: isSuppressed ? ("suppressed" as DeliveryStatus) : ("pending" as DeliveryStatus),
      attemptCount: 0,
      idempotencyKey: `${campObjId.toHexString()}:${contact._id.toHexString()}`,
      suppressedAt: isSuppressed ? now : undefined,
      safeError: isSuppressed ? "Recipient missing required consent or has revoked consent." : undefined,
      createdAt: now,
      updatedAt: now,
    });
  }

  if (deliveryDocs.length > 0) {
    try {
      await ctx.db.collection(COLLECTIONS.marketingCampaignDeliveries).insertMany(deliveryDocs, { ordered: false });
    } catch (err: any) {
      if (!err?.message?.includes("duplicate")) throw err;
    }
  }

  const queued = await ctx.db
    .collection(COLLECTIONS.marketingCampaignDeliveries)
    .countDocuments({ companyId: ctx.companyId, campaignId: campObjId });

  await recordAudit(ctx.db, {
    companyId: ctx.companyId,
    actorUserId: ctx.userId,
    action: "marketing.campaign.dispatch",
    entityType: "marketing_campaign",
    entityId: campaignId,
    requestId: ctx.requestId,
    metadata: { queuedDeliveries: queued },
  });

  return { queued, providerConfigured: getDeliveryProvider(campaign.channel as DeliveryChannel).configured };
}

/**
 * Claim pending or retryable delivery with a leased lock for worker processing.
 */
export async function claimDelivery(db: Db, workerId: string, options = WORKER_DEFAULTS) {
  await ensureIndexes(db);
  const now = new Date();
  const leaseExpiresAt = new Date(now.getTime() + options.leaseMs);

  return db.collection(COLLECTIONS.marketingCampaignDeliveries).findOneAndUpdate(
    {
      $or: [
        {
          status: "pending",
          $or: [{ nextAttemptAt: { $exists: false } }, { nextAttemptAt: { $lte: now } }],
        },
        {
          status: "failed",
          attemptCount: { $lt: options.maxAttempts },
          nextAttemptAt: { $lte: now },
        },
        {
          status: "processing",
          leaseExpiresAt: { $lte: now },
        },
      ],
    },
    {
      $set: {
        status: "processing",
        claimId: workerId,
        leaseExpiresAt,
        processingAt: now,
        lastAttemptAt: now,
        updatedAt: now,
      },
      $inc: { attemptCount: 1 },
    },
    { sort: { createdAt: 1 }, returnDocument: "after" }
  );
}

/**
 * Processes a single claimed delivery, checking consent at the last second and dispatching through adapter.
 */
export async function processClaimedDelivery(db: Db, delivery: any, options = WORKER_DEFAULTS) {
  const now = new Date();

  // 1. Re-check campaign state
  const campaign = await db.collection(COLLECTIONS.marketingCampaigns).findOne({
    _id: delivery.campaignId,
    companyId: delivery.companyId,
  });

  if (!campaign || campaign.status === "cancelled") {
    await db.collection(COLLECTIONS.marketingCampaignDeliveries).updateOne(
      { _id: delivery._id, companyId: delivery.companyId, claimId: delivery.claimId },
      {
        $set: {
          status: "cancelled",
          errorCategory: "campaign_cancelled",
          safeError: "Campaign was cancelled before delivery.",
          completedAt: now,
          updatedAt: now,
        },
        $unset: { claimId: "", leaseExpiresAt: "" },
      }
    );
    return "cancelled";
  }

  // 2. Re-check contact & consent immediately before dispatch
  const contact = await db.collection(COLLECTIONS.marketingContacts).findOne({
    _id: delivery.contactId,
    companyId: delivery.companyId,
    isActive: true,
  });

  const latestConsent = contact
    ? await db
        .collection(COLLECTIONS.marketingConsents)
        .find({ companyId: delivery.companyId, contactId: delivery.contactId, channel: delivery.channel })
        .sort({ recordedAt: -1 })
        .limit(1)
        .toArray()
    : [];

  const isSuppressed = !contact || latestConsent.length === 0 || latestConsent[0].status === "revoked";

  if (isSuppressed) {
    await db.collection(COLLECTIONS.marketingCampaignDeliveries).updateOne(
      { _id: delivery._id, companyId: delivery.companyId, claimId: delivery.claimId },
      {
        $set: {
          status: "suppressed",
          errorCategory: "ineligible",
          safeError: "Recipient consent was revoked or contact was archived prior to dispatch.",
          suppressedAt: now,
          completedAt: now,
          updatedAt: now,
        },
        $unset: { claimId: "", leaseExpiresAt: "" },
      }
    );
    return "suppressed";
  }

  // 3. Dispatch via provider adapter
  const provider = getDeliveryProvider(delivery.channel as DeliveryChannel);
  const result = await provider.send({
    channel: delivery.channel,
    destination: delivery.destination,
    subject: campaign.snapshot?.subject ?? campaign.subject ?? "",
    body: campaign.snapshot?.body ?? campaign.body ?? "",
    idempotencyKey: delivery.idempotencyKey,
  });

  if (result.status === "accepted" && result.providerMessageId) {
    await db.collection(COLLECTIONS.marketingCampaignDeliveries).updateOne(
      { _id: delivery._id, companyId: delivery.companyId, claimId: delivery.claimId },
      {
        $set: {
          status: "sent",
          providerMessageId: result.providerMessageId,
          sentAt: now,
          completedAt: now,
          updatedAt: now,
        },
        $unset: { claimId: "", leaseExpiresAt: "" },
      }
    );
    return "sent";
  }

  // 4. Handle provider error / retry policy
  const retryable = result.retryable && delivery.attemptCount < options.maxAttempts;
  const nextAttemptAt = retryable
    ? new Date(now.getTime() + retryDelay(delivery.attemptCount, options.baseBackoffMs, options.maxBackoffMs))
    : undefined;

  await db.collection(COLLECTIONS.marketingCampaignDeliveries).updateOne(
    { _id: delivery._id, companyId: delivery.companyId, claimId: delivery.claimId },
    {
      $set: {
        status: "failed",
        nextAttemptAt,
        errorCategory: result.errorCategory ?? "provider_error",
        safeError: result.safeError ?? "Provider rejected the delivery.",
        failedAt: now,
        updatedAt: now,
      },
      $unset: { claimId: "", leaseExpiresAt: "" },
    }
  );

  return "failed";
}

export async function runDeliveryWorkerOnce(db: Db, workerId: string, options = WORKER_DEFAULTS): Promise<number> {
  let processed = 0;
  for (let i = 0; i < options.batchSize; i++) {
    const delivery = await claimDelivery(db, workerId, options);
    if (!delivery) break;
    await processClaimedDelivery(db, delivery, options);
    processed++;
  }
  return processed;
}

// ─────────────────────────────────────────────────────────────────────────────
// QUERY & USER ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function getDeliverySummary(
  ctx: WorkspaceContext,
  campaignId: string
): Promise<{ total: number; byStatus: Record<string, number>; providerConfigured: boolean }> {
  assertPermission(ctx.permissions, PERMISSIONS.MARKETING_READ);
  if (!ObjectId.isValid(campaignId)) throw new AppError("NOT_FOUND", "Campaign not found.");

  const campObjId = new ObjectId(campaignId);
  const filter = { companyId: ctx.companyId, campaignId: campObjId };

  const [counts, total, campaign] = await Promise.all([
    ctx.db
      .collection(COLLECTIONS.marketingCampaignDeliveries)
      .aggregate([{ $match: filter }, { $group: { _id: "$status", count: { $sum: 1 } } }])
      .toArray(),
    ctx.db.collection(COLLECTIONS.marketingCampaignDeliveries).countDocuments(filter),
    ctx.db.collection(COLLECTIONS.marketingCampaigns).findOne({ _id: campObjId, companyId: ctx.companyId }),
  ]);

  const byStatus: Record<string, number> = {};
  for (const item of counts) {
    byStatus[String(item._id)] = Number(item.count);
  }

  const providerConfigured = campaign
    ? getDeliveryProvider(campaign.channel as DeliveryChannel).configured
    : false;

  return { total, byStatus, providerConfigured };
}

export async function listDeliveries(
  ctx: WorkspaceContext,
  campaignId: string,
  page = 1,
  pageSize = 20
): Promise<{ items: CampaignDelivery[]; total: number; page: number; pageSize: number }> {
  assertPermission(ctx.permissions, PERMISSIONS.MARKETING_READ);
  if (!ObjectId.isValid(campaignId)) throw new AppError("NOT_FOUND", "Campaign not found.");

  const filter = { companyId: ctx.companyId, campaignId: new ObjectId(campaignId) };
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(1, pageSize));

  const [docs, total] = await Promise.all([
    ctx.db
      .collection(COLLECTIONS.marketingCampaignDeliveries)
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safePageSize)
      .limit(safePageSize)
      .toArray(),
    ctx.db.collection(COLLECTIONS.marketingCampaignDeliveries).countDocuments(filter),
  ]);

  const items: CampaignDelivery[] = docs.map((d) => ({
    id: d._id.toHexString(),
    companyId: d.companyId.toHexString(),
    campaignId: d.campaignId.toHexString(),
    contactId: d.contactId.toHexString(),
    channel: d.channel,
    destination: d.destination,
    recipientName: d.recipientName,
    status: d.status,
    attemptCount: d.attemptCount ?? 0,
    nextAttemptAt: d.nextAttemptAt ? new Date(d.nextAttemptAt).toISOString() : undefined,
    providerMessageId: d.providerMessageId,
    idempotencyKey: d.idempotencyKey,
    safeError: d.safeError,
    errorCategory: d.errorCategory,
    sentAt: d.sentAt ? new Date(d.sentAt).toISOString() : undefined,
    deliveredAt: d.deliveredAt ? new Date(d.deliveredAt).toISOString() : undefined,
    failedAt: d.failedAt ? new Date(d.failedAt).toISOString() : undefined,
    suppressedAt: d.suppressedAt ? new Date(d.suppressedAt).toISOString() : undefined,
    createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : new Date().toISOString(),
  }));

  return { items, total, page: safePage, pageSize: safePageSize };
}

export async function retryDelivery(ctx: WorkspaceContext, deliveryId: string): Promise<boolean> {
  assertPermission(ctx.permissions, PERMISSIONS.MARKETING_CAMPAIGNS_MANAGE);
  if (!ObjectId.isValid(deliveryId)) throw new AppError("NOT_FOUND", "Delivery not found.");

  const result = await ctx.db.collection(COLLECTIONS.marketingCampaignDeliveries).updateOne(
    {
      companyId: ctx.companyId,
      _id: new ObjectId(deliveryId),
      status: "failed",
      errorCategory: { $nin: ["not_configured", "permanent", "ineligible"] },
    },
    {
      $set: {
        status: "pending",
        nextAttemptAt: new Date(),
        updatedAt: new Date(),
      },
      $unset: { safeError: "", errorCategory: "" },
    }
  );

  return result.modifiedCount > 0;
}

export async function cancelDelivery(ctx: WorkspaceContext, deliveryId: string): Promise<boolean> {
  assertPermission(ctx.permissions, PERMISSIONS.MARKETING_CAMPAIGNS_MANAGE);
  if (!ObjectId.isValid(deliveryId)) throw new AppError("NOT_FOUND", "Delivery not found.");

  const result = await ctx.db.collection(COLLECTIONS.marketingCampaignDeliveries).updateOne(
    {
      companyId: ctx.companyId,
      _id: new ObjectId(deliveryId),
      status: { $in: ["pending", "failed"] },
    },
    {
      $set: {
        status: "cancelled",
        completedAt: new Date(),
        updatedAt: new Date(),
      },
      $unset: { nextAttemptAt: "", claimId: "", leaseExpiresAt: "" },
    }
  );

  return result.modifiedCount > 0;
}

export async function ingestDeliveryEvent(
  db: Db,
  companyId: ObjectId,
  event: NormalizedDeliveryEvent
): Promise<{ duplicate: boolean; status: string }> {
  await ensureIndexes(db);

  const delivery = await db.collection(COLLECTIONS.marketingCampaignDeliveries).findOne({
    companyId,
    idempotencyKey: event.deliveryReference,
  });

  if (!delivery) throw new AppError("NOT_FOUND", "Delivery record not found.");

  try {
    await db.collection(COLLECTIONS.marketingCampaignEvents).insertOne({
      companyId,
      campaignId: delivery.campaignId,
      deliveryId: delivery._id,
      provider: event.provider,
      providerEventId: event.providerEventId,
      eventType: event.type,
      occurredAt: event.occurredAt,
      ingestedAt: new Date(),
    });
  } catch (error: any) {
    if (error?.message?.includes("duplicate")) {
      return { duplicate: true, status: delivery.status };
    }
    throw error;
  }

  const next = nextDeliveryStatus(delivery.status, event.type);
  if (next && next !== delivery.status) {
    await db.collection(COLLECTIONS.marketingCampaignDeliveries).updateOne(
      { _id: delivery._id, companyId },
      { $set: { status: next, updatedAt: new Date() } }
    );
    return { duplicate: false, status: next };
  }

  return { duplicate: false, status: delivery.status };
}
