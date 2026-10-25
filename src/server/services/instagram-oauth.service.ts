import "server-only";
import { randomBytes } from "node:crypto";
import { type Db } from "mongodb";
import clientPromise from "@/server/db/client";
import { decryptSecret, encryptSecret } from "@/server/marketing/secret-box";
import { instagramConfig, instagramConfigured } from "@/server/marketing/instagram.config";
import { storeSocialAccount } from "@/server/services/social-account.service";
import { companyIdForEmail } from "@/server/authz/company";

const scopes = (process.env.INSTAGRAM_SCOPES ?? "instagram_business_basic,instagram_business_content_publish").split(",").map((value) => value.trim()).filter(Boolean);
async function db(): Promise<Db> { const client = await clientPromise; return client.db(); }

export async function startInstagramOAuth(ownerEmail: string) {
  if (!instagramConfigured()) throw new Error("INSTAGRAM_NOT_CONFIGURED");
  const config = instagramConfig(); const database = await db(); await database.collection("marketing_oauth_states").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  const state = randomBytes(32).toString("base64url");
  await database.collection("marketing_oauth_states").insertOne({ stateHash: encryptSecret(state), companyId: await companyIdForEmail(ownerEmail), ownerEmail: ownerEmail.toLowerCase().trim(), provider: "instagram", status: "pending", expiresAt: new Date(Date.now() + 10 * 60 * 1000), createdAt: new Date() });
  const params = new URLSearchParams({ client_id: config.appId ?? "", redirect_uri: config.callbackUrl ?? "", response_type: "code", scope: scopes.join(","), state });
  return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
}

export async function consumeInstagramOAuthState(ownerEmail: string, state: string) {
  const database = await db(); const records = await database.collection("marketing_oauth_states").find({ companyId: await companyIdForEmail(ownerEmail), ownerEmail: ownerEmail.toLowerCase().trim(), provider: "instagram", status: "pending", expiresAt: { $gt: new Date() } }).toArray();
  const record = records.find((candidate) => { try { return decryptSecret(candidate.stateHash) === state; } catch { return false; } });
  if (!record) throw new Error("INVALID_OAUTH_STATE");
  const claimed = await database.collection("marketing_oauth_states").findOneAndUpdate({ _id: record._id, status: "pending" }, { $set: { status: "consumed", consumedAt: new Date() } }, { returnDocument: "after" });
  if (!claimed) throw new Error("OAUTH_STATE_REPLAY"); return claimed;
}

export async function exchangeInstagramCode(code: string) {
  const config = instagramConfig(); if (!instagramConfigured()) throw new Error("INSTAGRAM_NOT_CONFIGURED");
  const response = await fetch("https://api.instagram.com/oauth/access_token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: config.appId ?? "", client_secret: config.appSecret ?? "", grant_type: "authorization_code", redirect_uri: config.callbackUrl ?? "", code }) });
  const data: unknown = await response.json(); if (!response.ok || !data || typeof data !== "object" || !("access_token" in data) || typeof data.access_token !== "string") throw new Error("INSTAGRAM_CODE_EXCHANGE_FAILED");
  const longLived = await fetch(`https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(config.appSecret ?? "")}&access_token=${encodeURIComponent(data.access_token)}`);
  const longLivedData: unknown = await longLived.json(); if (!longLived.ok || !longLivedData || typeof longLivedData !== "object" || !("access_token" in longLivedData) || typeof longLivedData.access_token !== "string") throw new Error("INSTAGRAM_LONG_LIVED_TOKEN_FAILED");
  return { token: longLivedData.access_token, expiresIn: "expires_in" in longLivedData && typeof longLivedData.expires_in === "number" ? longLivedData.expires_in : undefined };
}

export async function discoverInstagramProfessionalAccount(accessToken: string) {
  const config = instagramConfig(); const response = await fetch(`https://graph.instagram.com/${config.graphVersion}/me?fields=user_id,username,name,account_type`, { headers: { Authorization: `Bearer ${accessToken}` } }); const data: unknown = await response.json();
  if (!response.ok || !data || typeof data !== "object" || !("user_id" in data) || typeof data.user_id !== "string" || !("account_type" in data) || !["BUSINESS", "CREATOR"].includes(String(data.account_type))) throw new Error("INSTAGRAM_ACCOUNT_NOT_ELIGIBLE");
  return { id: data.user_id, name: "name" in data && typeof data.name === "string" ? data.name : ("username" in data && typeof data.username === "string" ? data.username : "Instagram Professional account"), accountType: String(data.account_type) };
}

export async function connectInstagramAccount(ownerEmail: string, account: { id: string; name: string; token: string; expiresIn?: number }) { return storeSocialAccount(ownerEmail, { platform: "instagram", providerAccountId: account.id, displayName: account.name, scopes, tokenExpiresAt: account.expiresIn ? new Date(Date.now() + account.expiresIn * 1000).toISOString() : undefined, accessToken: account.token }); }
