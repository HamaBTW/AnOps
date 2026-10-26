/**
 * Marketing enums shared by the server and client bundles. Keep this file free of server-only imports:
 * forms and filters import it directly.
 */
export const CONTACT_SOURCES = ["manual", "import", "website", "referral", "event", "other"] as const;
export type ContactSource = (typeof CONTACT_SOURCES)[number];

export const LIFECYCLE_STAGES = ["lead", "prospect", "customer", "inactive"] as const;
export type LifecycleStage = (typeof LIFECYCLE_STAGES)[number];

export const MARKETING_CHANNELS = ["email", "sms"] as const;
export type MarketingChannel = (typeof MARKETING_CHANNELS)[number];

/** Only one purpose exists today. Consent is stored per purpose so new purposes need no migration. */
export const CONSENT_PURPOSES = ["marketing"] as const;
export type ConsentPurpose = (typeof CONSENT_PURPOSES)[number];

export const CAMPAIGN_STATUSES = [
  "draft",
  "pending_approval",
  "approved",
  "scheduled",
  "processing",
  "completed",
  "cancelled",
  "failed",
] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const DELIVERY_STATUSES = [
  "pending",
  "sending",
  "sent",
  "delivered",
  "bounced",
  "complained",
  "failed",
  "suppressed",
] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const DELIVERY_EVENT_TYPES = [
  "delivered",
  "bounced",
  "complained",
  "failed",
  "opened",
  "clicked",
  "unsubscribed",
] as const;
export type DeliveryEventType = (typeof DELIVERY_EVENT_TYPES)[number];

export const SOCIAL_PLATFORMS = ["facebook_page"] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const SOCIAL_POST_STATUSES = [
  "draft",
  "scheduled",
  "publishing",
  "published",
  "failed",
  "cancelled",
  "needs_reconciliation",
] as const;
export type SocialPostStatus = (typeof SOCIAL_POST_STATUSES)[number];

export const AI_GENERATION_STATUSES = ["generated_draft", "edited", "approved_for_use", "failed"] as const;
export type AiGenerationStatus = (typeof AI_GENERATION_STATUSES)[number];

export const AI_CHANNELS = ["email", "sms", "facebook_page"] as const;
export const AI_TONES = ["friendly", "professional", "playful", "urgent", "formal"] as const;
export const AI_LANGUAGES = ["en", "fr", "ar"] as const;

export const JOB_TYPES = ["campaign.dispatch", "social.publish"] as const;
export type JobType = (typeof JOB_TYPES)[number];
