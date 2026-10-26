import "server-only";
import { createHmac } from "crypto";
import { env } from "@/config/env";

/**
 * Marketing integration configuration. Every integration reports its own state. A missing or invalid
 * value marks that integration unavailable and never stops unrelated application features.
 * Error messages name variables but never print their values.
 */

export type IntegrationState =
  | { configured: true }
  | { configured: false; reason: string; missing: string[] };

export type SocialConfig = IntegrationState & {
  appId?: string;
  appSecret?: string;
  encryptionKey?: Buffer;
};

/** Meta Graph API version used for OAuth and publishing. Verify against Meta's current version before enabling. */
export const META_GRAPH_VERSION = "v21.0";

/** Facebook Page permissions only. Instagram publishing needs separate review and is not requested. */
export const META_PAGE_SCOPES = ["pages_show_list", "pages_manage_posts", "pages_read_engagement"] as const;

export function getSocialConfig(): SocialConfig {
  const missing: string[] = [];
  if (!env.FACEBOOK_APP_ID) missing.push("FACEBOOK_APP_ID");
  if (!env.FACEBOOK_APP_SECRET) missing.push("FACEBOOK_APP_SECRET");
  if (!env.SOCIAL_TOKEN_ENCRYPTION_KEY) missing.push("SOCIAL_TOKEN_ENCRYPTION_KEY");
  if (missing.length > 0) {
    return { configured: false, reason: "Social integration is not configured.", missing };
  }

  const encryptionKey = parseEncryptionKey(env.SOCIAL_TOKEN_ENCRYPTION_KEY as string);
  if (!encryptionKey) {
    return {
      configured: false,
      reason: "SOCIAL_TOKEN_ENCRYPTION_KEY must be 32 random bytes encoded as base64 or 64 hex characters.",
      missing: ["SOCIAL_TOKEN_ENCRYPTION_KEY (invalid format)"],
    };
  }

  return {
    configured: true,
    appId: env.FACEBOOK_APP_ID,
    appSecret: env.FACEBOOK_APP_SECRET,
    encryptionKey,
  };
}

/** Accepts exactly 32 bytes, as base64 (44 characters) or hex (64 characters). Anything else is rejected. */
export function parseEncryptionKey(raw: string): Buffer | null {
  const value = raw.trim();
  if (/^[0-9a-fA-F]{64}$/.test(value)) return Buffer.from(value, "hex");
  if (/^[A-Za-z0-9+/]{43}=$/.test(value)) {
    const decoded = Buffer.from(value, "base64");
    return decoded.length === 32 ? decoded : null;
  }
  return null;
}

/** Webhook signing secret. Must be long enough to resist guessing. */
export function getWebhookSecret(): string | null {
  const secret = env.MARKETING_WEBHOOK_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

export function getWorkerSecret(): string | null {
  const secret = env.MARKETING_WORKER_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

/**
 * Key for unsubscribe tokens. Derived from AUTH_SECRET so no new secret is required, and separated from
 * other uses of that secret by a fixed label.
 */
export function unsubscribeSigningKey(): Buffer {
  return createHmac("sha256", env.AUTH_SECRET).update("anops.marketing.unsubscribe.v1").digest();
}
