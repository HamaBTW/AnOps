import "server-only";

import { ObjectId, type Db } from "mongodb";
import { COLLECTIONS } from "@/server/db/documents";
import { ensureIndexes } from "@/server/db/indexes";
import type { WorkspaceContext } from "@/server/tenancy/workspace";
import { assertPermission, PERMISSIONS } from "@/server/security/permissions";
import { recordAudit } from "@/server/audit/audit.service";
import { AppError } from "@/shared/lib/errors";
import { socialAccountMetadataSchema } from "@/features/marketing/schemas/social-account.schema";
import { encryptSecret } from "@/server/marketing/secret-box";
import type { SocialAccount } from "@/features/marketing/types";

export async function listSocialAccounts(ctx: WorkspaceContext): Promise<SocialAccount[]> {
  assertPermission(ctx.permissions, PERMISSIONS.MARKETING_READ);
  await ensureIndexes(ctx.db);

  const docs = await ctx.db
    .collection(COLLECTIONS.marketingSocialAccounts)
    .find({ companyId: ctx.companyId })
    .sort({ updatedAt: -1 })
    // Explicit projection: NEVER return encrypted access tokens or refresh tokens
    .project({
      encryptedAccessToken: 0,
      encryptedRefreshToken: 0,
    })
    .toArray();

  return docs.map((doc) => ({
    id: doc._id.toHexString(),
    companyId: doc.companyId.toHexString(),
    platform: doc.platform,
    providerAccountId: doc.providerAccountId,
    displayName: doc.displayName,
    connectionStatus: doc.connectionStatus,
    scopes: doc.scopes ?? [],
    connectedAt: doc.connectedAt ? new Date(doc.connectedAt).toISOString() : new Date().toISOString(),
    tokenExpiresAt: doc.tokenExpiresAt ? new Date(doc.tokenExpiresAt).toISOString() : undefined,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
  }));
}

export async function storeSocialAccount(
  ctx: WorkspaceContext,
  raw: unknown
): Promise<SocialAccount> {
  assertPermission(ctx.permissions, PERMISSIONS.MARKETING_SOCIAL_MANAGE);
  await ensureIndexes(ctx.db);

  const data = socialAccountMetadataSchema.parse(raw);
  const accessToken =
    raw && typeof raw === "object" && "accessToken" in raw && typeof raw.accessToken === "string"
      ? raw.accessToken
      : "";
  const refreshToken =
    raw && typeof raw === "object" && "refreshToken" in raw && typeof raw.refreshToken === "string"
      ? raw.refreshToken
      : "";

  if (!accessToken) {
    throw new AppError("VALIDATION_ERROR", "A valid provider access token is required.");
  }

  const now = new Date();
  const document = {
    companyId: ctx.companyId,
    platform: data.platform,
    providerAccountId: data.providerAccountId,
    displayName: data.displayName,
    connectionStatus: "connected",
    scopes: data.scopes ?? [],
    encryptedAccessToken: encryptSecret(accessToken),
    encryptedRefreshToken: refreshToken ? encryptSecret(refreshToken) : undefined,
    tokenExpiresAt: data.tokenExpiresAt ? new Date(data.tokenExpiresAt) : undefined,
    connectedByUserId: ctx.userId,
    connectedAt: now,
    updatedAt: now,
  };

  const result = await ctx.db.collection(COLLECTIONS.marketingSocialAccounts).findOneAndUpdate(
    { companyId: ctx.companyId, platform: data.platform, providerAccountId: data.providerAccountId },
    { $set: document, $setOnInsert: { createdAt: now } },
    { upsert: true, returnDocument: "after" }
  );

  if (!result) {
    throw new AppError("INTERNAL", "Failed to store social account.");
  }

  await recordAudit(ctx.db, {
    companyId: ctx.companyId,
    actorUserId: ctx.userId,
    action: "marketing.social_account.connect",
    entityType: "marketing_social_account",
    entityId: result._id.toHexString(),
    requestId: ctx.requestId,
    metadata: { platform: data.platform, displayName: data.displayName },
  });

  return {
    id: result._id.toHexString(),
    companyId: ctx.companyId.toHexString(),
    platform: data.platform,
    providerAccountId: data.providerAccountId,
    displayName: data.displayName,
    connectionStatus: "connected",
    scopes: data.scopes ?? [],
    connectedAt: now.toISOString(),
    tokenExpiresAt: data.tokenExpiresAt,
    updatedAt: now.toISOString(),
  };
}

export async function disconnectSocialAccount(
  ctx: WorkspaceContext,
  id: string
): Promise<boolean> {
  assertPermission(ctx.permissions, PERMISSIONS.MARKETING_SOCIAL_MANAGE);
  if (!ObjectId.isValid(id)) throw new AppError("NOT_FOUND", "Social account not found.");

  const result = await ctx.db.collection(COLLECTIONS.marketingSocialAccounts).updateOne(
    { _id: new ObjectId(id), companyId: ctx.companyId, connectionStatus: { $ne: "disconnected" } },
    {
      $set: { connectionStatus: "disconnected", updatedAt: new Date() },
      $unset: { encryptedAccessToken: "", encryptedRefreshToken: "" },
    }
  );

  if (result.modifiedCount > 0) {
    await recordAudit(ctx.db, {
      companyId: ctx.companyId,
      actorUserId: ctx.userId,
      action: "marketing.social_account.disconnect",
      entityType: "marketing_social_account",
      entityId: id,
      requestId: ctx.requestId,
    });
    return true;
  }

  return false;
}
