import "server-only";
import type { ObjectId } from "mongodb";
import type { TenantScope } from "@/server/db/documents";
import type {
  AiGenerationStatus,
  ConsentPurpose,
  CampaignStatus,
  ContactSource,
  DeliveryEventType,
  DeliveryStatus,
  JobType,
  LifecycleStage,
  MarketingChannel,
  SocialPlatform,
  SocialPostStatus,
} from "@/features/marketing/types/constants";

export type {
  AiGenerationStatus,
  ConsentPurpose,
  CampaignStatus,
  ContactSource,
  DeliveryEventType,
  DeliveryStatus,
  JobType,
  LifecycleStage,
  MarketingChannel,
  SocialPlatform,
  SocialPostStatus,
};

/**
 * Marketing persistence shapes. Internal only: services map them to DTOs before anything leaves
 * the server. Every document carries `companyId`, the single tenant key.
 *
 * Canonical identity: `marketing_contacts` is the contact identity for the whole platform. CRM and
 * Sales should reference `contactId` instead of creating another customer record for the same person
 * (see docs/MARKETING.md, "Canonical contact identity").
 */
export const MARKETING_COLLECTIONS = {
  contacts: "marketing_contacts",
  tags: "marketing_tags",
  contactTags: "marketing_contact_tags",
  consentEvents: "marketing_consent_events",
  consentStates: "marketing_consent_states",
  suppressions: "marketing_suppressions",
  audiences: "marketing_audiences",
  templates: "marketing_templates",
  campaigns: "marketing_campaigns",
  deliveries: "marketing_deliveries",
  deliveryEvents: "marketing_delivery_events",
  jobs: "marketing_jobs",
  socialAccounts: "marketing_social_accounts",
  socialOauthStates: "marketing_social_oauth_states",
  socialPosts: "marketing_social_posts",
  aiGenerations: "marketing_ai_generations",
} as const;

export type ContactDoc = TenantScope & {
  _id: ObjectId;
  firstName: string;
  lastName: string;
  /** Lower-cased display-search key, "first last". */
  searchName: string;
  email: string;
  /** Present only when an email address exists. Unique per company (partial index). */
  normalizedEmail?: string;
  /** Digits with an optional leading "+". Empty string when no phone is known. */
  phone: string;
  source: ContactSource;
  lifecycleStage: LifecycleStage;
  isActive: boolean;
  createdBy: ObjectId;
  updatedBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  version: number;
};

export type TagDoc = TenantScope & {
  _id: ObjectId;
  name: string;
  normalizedName: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ContactTagDoc = TenantScope & {
  _id: ObjectId;
  contactId: ObjectId;
  tagId: ObjectId;
  assignedBy: ObjectId;
  assignedAt: Date;
};

export type ConsentStatus = "granted" | "withdrawn";
export type ConsentSource = "manual" | "import" | "form" | "unsubscribe_link" | "api";

/** Append-only consent history. Never updated or deleted. */
export type ConsentEventDoc = TenantScope & {
  _id: ObjectId;
  contactId: ObjectId;
  channel: MarketingChannel;
  purpose: ConsentPurpose;
  status: ConsentStatus;
  source: ConsentSource;
  /** When the consent change happened according to the source. Used for ordering. */
  occurredAt: Date;
  recordedAt: Date;
  /** Null for public unsubscribe links, which are not tied to a user account. */
  recordedBy: ObjectId | null;
  requestId: string;
};

/** Current effective consent: one document per contact, channel and purpose. */
export type ConsentStateDoc = TenantScope & {
  _id: ObjectId;
  contactId: ObjectId;
  channel: MarketingChannel;
  purpose: ConsentPurpose;
  status: ConsentStatus;
  occurredAt: Date;
  eventId: ObjectId;
  updatedAt: Date;
};

export type SuppressionReason = "unsubscribed" | "bounced" | "complained" | "manual";

export type SuppressionDoc = TenantScope & {
  _id: ObjectId;
  channel: MarketingChannel;
  /** Lower-cased email, or normalized phone. */
  normalizedDestination: string;
  reason: SuppressionReason;
  contactId: ObjectId | null;
  createdAt: Date;
};

export type AudienceConditionDoc =
  | { type: "lifecycle_stage"; values: LifecycleStage[] }
  | { type: "source"; values: ContactSource[] }
  | { type: "active"; value: boolean }
  | { type: "tags"; tagIds: ObjectId[]; match: "any" | "all" }
  | { type: "consent"; channel: MarketingChannel; status: "granted" | "not_granted" }
  | { type: "created_after"; date: Date };

/** Stored selection rule. Evaluated dynamically; membership is never materialized. */
export type AudienceRuleDoc = {
  match: "all" | "any";
  conditions: AudienceConditionDoc[];
};

export type AudienceDoc = TenantScope & {
  _id: ObjectId;
  name: string;
  normalizedName: string;
  description: string;
  selectionRule: AudienceRuleDoc;
  isActive: boolean;
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  version: number;
};

export type TemplateDoc = TenantScope & {
  _id: ObjectId;
  name: string;
  normalizedName: string;
  channel: MarketingChannel;
  subject: string;
  body: string;
  isActive: boolean;
  version: number;
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

/** Frozen at approval. Audience edits never change this record. */
export type CampaignSnapshotDoc = {
  takenAt: Date;
  audienceId: ObjectId;
  audienceName: string;
  audienceRule: AudienceRuleDoc;
  matchedCount: number;
  eligibleCount: number;
  suppressedCount: number;
  exclusions: Record<string, number>;
};

export type CampaignDoc = TenantScope & {
  _id: ObjectId;
  name: string;
  channel: MarketingChannel;
  status: CampaignStatus;
  audienceId: ObjectId;
  templateId: ObjectId | null;
  templateVersion: number | null;
  subject: string;
  body: string;
  contentVersion: number;
  snapshot: CampaignSnapshotDoc | null;
  scheduledAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  failureCode: string | null;
  createdBy: ObjectId;
  submittedBy: ObjectId | null;
  submittedAt: Date | null;
  approvedBy: ObjectId | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
};

/**
 * One row per campaign recipient, including suppressed ones so exclusions stay explainable.
 * (companyId, campaignId, contactId) is the idempotency key for snapshot creation.
 */
export type DeliveryDoc = TenantScope & {
  _id: ObjectId;
  campaignId: ObjectId;
  contactId: ObjectId;
  channel: MarketingChannel;
  /** Email address or phone number captured at snapshot time. */
  destination: string;
  status: DeliveryStatus;
  exclusionReason: string | null;
  providerMessageId: string | null;
  attemptCount: number;
  nextAttemptAt: Date | null;
  lastAttemptAt: Date | null;
  lastErrorCode: string | null;
  sentAt: Date | null;
  deliveredAt: Date | null;
  bouncedAt: Date | null;
  complainedAt: Date | null;
  failedAt: Date | null;
  firstOpenedAt: Date | null;
  firstClickedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
};

export type DeliveryEventDoc = TenantScope & {
  _id: ObjectId;
  campaignId: ObjectId;
  deliveryId: ObjectId;
  type: DeliveryEventType;
  providerName: string;
  /** Provider-assigned event id. Unique per company, which makes webhook replays harmless. */
  providerEventId: string;
  occurredAt: Date;
  receivedAt: Date;
};

export type JobDoc = TenantScope & {
  _id: ObjectId;
  type: JobType;
  targetId: ObjectId;
  /** Stable key, for example "campaign.dispatch:<id>". Enqueueing the same key twice is a no-op. */
  key: string;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled" | "dead";
  runAt: Date;
  attempts: number;
  maxAttempts: number;
  leaseOwner: string | null;
  leaseExpiresAt: Date | null;
  lastErrorCode: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SocialConnectionStatus = "connected" | "reauthorization_required" | "disconnected";

export type SocialAccountDoc = TenantScope & {
  _id: ObjectId;
  platform: SocialPlatform;
  externalAccountId: string;
  displayName: string;
  connectionStatus: SocialConnectionStatus;
  /** AES-256-GCM envelope, see server/marketing/social/crypto.ts. Never returned to clients. */
  encryptedToken: string | null;
  grantedScopes: string[];
  connectedBy: ObjectId;
  connectedAt: Date;
  disconnectedAt: Date | null;
  lastErrorCode: string | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
};

export type SocialOauthStateDoc = TenantScope & {
  /** SHA-256 of the state value. The raw state is only held by the browser. */
  _id: string;
  userId: ObjectId;
  platform: SocialPlatform;
  createdAt: Date;
  expiresAt: Date;
  consumedAt: Date | null;
};

export type SocialPostDoc = TenantScope & {
  _id: ObjectId;
  socialAccountId: ObjectId;
  platform: SocialPlatform;
  accountName: string;
  content: string;
  status: SocialPostStatus;
  scheduledAt: Date | null;
  publishedAt: Date | null;
  /** Set only after the provider confirmed publication. */
  externalPostId: string | null;
  attemptCount: number;
  lastErrorCode: string | null;
  createdBy: ObjectId;
  updatedBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  version: number;
};

export type AiCopyDoc = { subject: string; body: string };

export type AiGenerationDoc = TenantScope & {
  _id: ObjectId;
  requestedBy: ObjectId;
  productDescription: string;
  targetAudience: string;
  channel: "email" | "sms" | "facebook_page";
  tone: string;
  goal: string;
  language: "en" | "fr" | "ar";
  status: AiGenerationStatus;
  generated: AiCopyDoc | null;
  current: AiCopyDoc | null;
  errorCode: string | null;
  providerName: string | null;
  modelName: string | null;
  latencyMs: number | null;
  approvedBy: ObjectId | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
};
