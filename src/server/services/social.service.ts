import "server-only";

import { ObjectId, type Db, type Filter } from "mongodb";
import { COLLECTIONS } from "@/server/db/documents";
import { ensureIndexes } from "@/server/db/indexes";
import type { WorkspaceContext } from "@/server/tenancy/workspace";
import { assertPermission, PERMISSIONS } from "@/server/security/permissions";
import { recordAudit } from "@/server/audit/audit.service";
import { AppError } from "@/shared/lib/errors";
import { socialPostSchema, type SocialPostInput } from "@/features/marketing/schemas/social.schema";
import { getSocialPublisher } from "@/server/marketing/social-provider";
import { decryptSecret } from "@/server/marketing/secret-box";
import { publishFacebookPageTextPost } from "@/server/marketing/facebook-provider";
import { publishInstagramImagePost } from "@/server/marketing/instagram-provider";
import type { SocialPost, SocialPostStatus } from "@/features/marketing/types";

function mapSocialPost(doc: any): SocialPost {
  return {
    id: doc._id.toHexString(),
    companyId: doc.companyId.toHexString(),
    content: doc.content,
    platform: doc.platform,
    accountId: doc.accountId ? doc.accountId.toHexString() : undefined,
    mediaUrl: doc.mediaUrl,
    status: doc.status,
    scheduledAt: doc.scheduledAt ? new Date(doc.scheduledAt).toISOString() : undefined,
    publishedAt: doc.publishedAt ? new Date(doc.publishedAt).toISOString() : undefined,
    providerPostId: doc.providerPostId,
    safeError: doc.safeError,
    createdByUserId: doc.createdByUserId ? doc.createdByUserId.toHexString() : "",
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
  };
}

export async function listSocialPosts(
  ctx: WorkspaceContext,
  status?: string
): Promise<SocialPost[]> {
  assertPermission(ctx.permissions, PERMISSIONS.MARKETING_READ);
  await ensureIndexes(ctx.db);

  const filter: Filter<any> = { companyId: ctx.companyId };
  const validStatuses = [
    "draft",
    "pending_approval",
    "approved",
    "scheduled",
    "publishing",
    "published",
    "failed",
    "manual_review",
    "cancelled",
  ];

  if (status && validStatuses.includes(status)) {
    filter.status = status;
  }

  const docs = await ctx.db
    .collection(COLLECTIONS.marketingSocialPosts)
    .find(filter)
    .sort({ scheduledAt: 1, updatedAt: -1 })
    .limit(100)
    .toArray();

  return docs.map((d) => mapSocialPost(d));
}

export async function getSocialPost(ctx: WorkspaceContext, id: string): Promise<SocialPost> {
  assertPermission(ctx.permissions, PERMISSIONS.MARKETING_READ);
  if (!ObjectId.isValid(id)) throw new AppError("NOT_FOUND", "Social post not found.");

  const doc = await ctx.db
    .collection(COLLECTIONS.marketingSocialPosts)
    .findOne({ _id: new ObjectId(id), companyId: ctx.companyId });
  if (!doc) throw new AppError("NOT_FOUND", "Social post not found.");

  return mapSocialPost(doc);
}

export async function createSocialPost(ctx: WorkspaceContext, raw: unknown): Promise<SocialPost> {
  assertPermission(ctx.permissions, PERMISSIONS.MARKETING_SOCIAL_MANAGE);
  await ensureIndexes(ctx.db);

  const data = socialPostSchema.parse(raw);
  const now = new Date();

  let accountObjId: ObjectId | undefined;
  if (data.accountId) {
    if (!ObjectId.isValid(data.accountId)) throw new AppError("VALIDATION_ERROR", "Invalid account ID.");
    accountObjId = new ObjectId(data.accountId);
    const account = await ctx.db.collection(COLLECTIONS.marketingSocialAccounts).findOne({
      _id: accountObjId,
      companyId: ctx.companyId,
      platform: data.platform,
      connectionStatus: "connected",
    });
    if (!account) throw new AppError("VALIDATION_ERROR", "Connected social account not found in this company.");
  }

  const doc = {
    companyId: ctx.companyId,
    content: data.content,
    platform: data.platform,
    accountId: accountObjId,
    mediaUrl: data.mediaUrl,
    scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
    status: "draft" as SocialPostStatus,
    createdByUserId: ctx.userId,
    createdAt: now,
    updatedAt: now,
  };

  const result = await ctx.db.collection(COLLECTIONS.marketingSocialPosts).insertOne(doc);

  await recordAudit(ctx.db, {
    companyId: ctx.companyId,
    actorUserId: ctx.userId,
    action: "marketing.social_post.create",
    entityType: "marketing_social_post",
    entityId: result.insertedId.toHexString(),
    requestId: ctx.requestId,
    metadata: { platform: data.platform },
  });

  return getSocialPost(ctx, result.insertedId.toHexString());
}

export async function updateSocialPost(
  ctx: WorkspaceContext,
  id: string,
  raw: unknown
): Promise<SocialPost> {
  assertPermission(ctx.permissions, PERMISSIONS.MARKETING_SOCIAL_MANAGE);
  if (!ObjectId.isValid(id)) throw new AppError("NOT_FOUND", "Social post not found.");
  const postObjId = new ObjectId(id);

  const current = await ctx.db
    .collection(COLLECTIONS.marketingSocialPosts)
    .findOne({ _id: postObjId, companyId: ctx.companyId, status: "draft" });
  if (!current) throw new AppError("CONFLICT", "Only draft social posts can be edited.");

  const data = socialPostSchema.parse(raw);
  let accountObjId: ObjectId | undefined;
  if (data.accountId) {
    if (!ObjectId.isValid(data.accountId)) throw new AppError("VALIDATION_ERROR", "Invalid account ID.");
    accountObjId = new ObjectId(data.accountId);
    const account = await ctx.db.collection(COLLECTIONS.marketingSocialAccounts).findOne({
      _id: accountObjId,
      companyId: ctx.companyId,
      platform: data.platform,
      connectionStatus: "connected",
    });
    if (!account) throw new AppError("VALIDATION_ERROR", "Connected social account not found in this company.");
  }

  await ctx.db.collection(COLLECTIONS.marketingSocialPosts).updateOne(
    { _id: postObjId, companyId: ctx.companyId },
    {
      $set: {
        content: data.content,
        platform: data.platform,
        accountId: accountObjId,
        mediaUrl: data.mediaUrl,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        updatedAt: new Date(),
      },
    }
  );

  return getSocialPost(ctx, id);
}

export async function transitionSocialPost(
  ctx: WorkspaceContext,
  id: string,
  command: "submit" | "approve" | "schedule" | "cancel" | "retry"
): Promise<SocialPostStatus> {
  if (!ObjectId.isValid(id)) throw new AppError("NOT_FOUND", "Social post not found.");
  const postObjId = new ObjectId(id);

  if (command === "approve") {
    assertPermission(ctx.permissions, PERMISSIONS.MARKETING_SOCIAL_PUBLISH);
  } else {
    assertPermission(ctx.permissions, PERMISSIONS.MARKETING_SOCIAL_MANAGE);
  }

  const allowed: Record<string, SocialPostStatus[]> = {
    submit: ["draft"],
    approve: ["pending_approval"],
    schedule: ["approved"],
    cancel: ["pending_approval", "approved", "scheduled"],
    retry: ["failed"],
  };

  const nextState: Record<string, SocialPostStatus> = {
    submit: "pending_approval",
    approve: "approved",
    schedule: "scheduled",
    cancel: "cancelled",
    retry: "scheduled",
  };

  const current = await ctx.db
    .collection(COLLECTIONS.marketingSocialPosts)
    .findOne({ _id: postObjId, companyId: ctx.companyId, status: { $in: allowed[command] } });

  if (!current) {
    throw new AppError("CONFLICT", `Action '${command}' is not valid in the post's current state.`);
  }

  if (command === "schedule" || command === "retry") {
    if (!current.scheduledAt || new Date(current.scheduledAt).getTime() <= Date.now()) {
      throw new AppError("VALIDATION_ERROR", "A future scheduled date/time is required to schedule a post.");
    }
    if (!current.accountId) {
      throw new AppError("VALIDATION_ERROR", "A connected social account is required before scheduling.");
    }
    const account = await ctx.db.collection(COLLECTIONS.marketingSocialAccounts).findOne({
      _id: current.accountId,
      companyId: ctx.companyId,
      platform: current.platform,
      connectionStatus: "connected",
    });
    if (!account) {
      throw new AppError("VALIDATION_ERROR", "Connected account is not active or eligible.");
    }
  }

  const targetStatus = nextState[command];
  const updateResult = await ctx.db.collection(COLLECTIONS.marketingSocialPosts).updateOne(
    { _id: postObjId, companyId: ctx.companyId, status: current.status },
    {
      $set: { status: targetStatus, updatedAt: new Date() },
      $unset: { safeError: "" },
    }
  );

  if (updateResult.modifiedCount !== 1) {
    throw new AppError("CONFLICT", "Concurrent update detected. Please reload.");
  }

  await recordAudit(ctx.db, {
    companyId: ctx.companyId,
    actorUserId: ctx.userId,
    action: `marketing.social_post.${command}`,
    entityType: "marketing_social_post",
    entityId: id,
    requestId: ctx.requestId,
    metadata: { previousStatus: current.status, newStatus: targetStatus },
  });

  return targetStatus;
}

export async function duplicateSocialPost(ctx: WorkspaceContext, id: string): Promise<SocialPost> {
  const current = await getSocialPost(ctx, id);
  return createSocialPost(ctx, {
    content: current.content,
    platform: current.platform,
    accountId: current.accountId,
    mediaUrl: current.mediaUrl,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKER PROCESSING & PUBLISHING
// ─────────────────────────────────────────────────────────────────────────────

export async function claimSocialPost(db: Db, workerId: string) {
  await ensureIndexes(db);
  const now = new Date();
  return db.collection(COLLECTIONS.marketingSocialPosts).findOneAndUpdate(
    {
      $or: [
        { status: "scheduled", scheduledAt: { $lte: now } },
        { status: "publishing", socialLeaseExpiresAt: { $lte: now } },
      ],
    },
    {
      $set: {
        status: "publishing",
        socialClaimId: workerId,
        socialLeaseExpiresAt: new Date(now.getTime() + 120_000),
        updatedAt: now,
      },
      $inc: { socialAttemptCount: 1 },
    },
    { sort: { scheduledAt: 1 }, returnDocument: "after" }
  );
}

export async function processClaimedSocialPost(db: Db, post: any) {
  const attemptNumber = post.socialAttemptCount ?? 1;
  const startedAt = new Date();
  let result: { status: "published" | "failed" | "uncertain"; providerPostId?: string; safeError?: string };

  if (post.platform === "facebook" && post.accountId) {
    const account = await db.collection(COLLECTIONS.marketingSocialAccounts).findOne({
      _id: post.accountId,
      companyId: post.companyId,
      platform: "facebook",
      connectionStatus: "connected",
    });

    if (!account?.encryptedAccessToken) {
      result = { status: "failed", safeError: "Facebook Page account is disconnected or unavailable." };
    } else {
      try {
        const token = decryptSecret(account.encryptedAccessToken);
        result = await publishFacebookPageTextPost(token, String(account.providerAccountId), post.content);
      } catch {
        result = { status: "failed", safeError: "Facebook credentials could not be decrypted." };
      }
    }
  } else if (post.platform === "instagram" && post.accountId && post.mediaUrl) {
    const account = await db.collection(COLLECTIONS.marketingSocialAccounts).findOne({
      _id: post.accountId,
      companyId: post.companyId,
      platform: "instagram",
      connectionStatus: "connected",
    });

    if (!account?.encryptedAccessToken) {
      result = { status: "failed", safeError: "Instagram Professional account is disconnected or unavailable." };
    } else {
      try {
        const token = decryptSecret(account.encryptedAccessToken);
        result = await publishInstagramImagePost(token, String(account.providerAccountId), post.content, post.mediaUrl);
      } catch {
        result = { status: "failed", safeError: "Instagram credentials could not be decrypted." };
      }
    }
  } else {
    const publisher = getSocialPublisher(post.platform);
    const generic = await publisher.publish(post.content, post._id.toHexString());
    result = {
      status: generic.status === "published" ? "published" : "failed",
      providerPostId: generic.providerPostId,
      safeError: generic.safeError,
    };
  }

  const outcome =
    result.status === "published" && result.providerPostId
      ? "confirmed"
      : result.status === "uncertain"
      ? "uncertain"
      : "failed";

  await db.collection(COLLECTIONS.marketingSocialPublishAttempts).insertOne({
    companyId: post.companyId,
    postId: post._id,
    attemptNumber,
    startedAt,
    completedAt: new Date(),
    outcome,
    safeError: result.safeError,
    createdAt: startedAt,
  });

  if (outcome === "confirmed") {
    await db.collection(COLLECTIONS.marketingSocialPosts).updateOne(
      { _id: post._id, companyId: post.companyId, status: "publishing", socialClaimId: post.socialClaimId },
      {
        $set: {
          status: "published",
          providerPostId: result.providerPostId,
          publishedAt: new Date(),
          updatedAt: new Date(),
        },
        $unset: { socialClaimId: "", socialLeaseExpiresAt: "" },
      }
    );
    return "published";
  }

  const nextStatus = outcome === "uncertain" ? "manual_review" : "failed";
  await db.collection(COLLECTIONS.marketingSocialPosts).updateOne(
    { _id: post._id, companyId: post.companyId, status: "publishing", socialClaimId: post.socialClaimId },
    {
      $set: {
        status: nextStatus,
        safeError: result.safeError ?? "Publishing provider failed.",
        updatedAt: new Date(),
      },
      $unset: { socialClaimId: "", socialLeaseExpiresAt: "" },
    }
  );

  return outcome;
}

export async function listSocialAttempts(ctx: WorkspaceContext, id: string): Promise<any[]> {
  assertPermission(ctx.permissions, PERMISSIONS.MARKETING_READ);
  if (!ObjectId.isValid(id)) throw new AppError("NOT_FOUND", "Social post not found.");

  const post = await ctx.db
    .collection(COLLECTIONS.marketingSocialPosts)
    .findOne({ companyId: ctx.companyId, _id: new ObjectId(id) }, { projection: { _id: 1 } });
  if (!post) throw new AppError("NOT_FOUND", "Social post not found.");

  return ctx.db
    .collection(COLLECTIONS.marketingSocialPublishAttempts)
    .find({ companyId: ctx.companyId, postId: new ObjectId(id) })
    .project({ _id: 0, companyId: 0, postId: 0 })
    .sort({ attemptNumber: -1 })
    .limit(50)
    .toArray();
}
