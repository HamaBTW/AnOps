export const marketingChannels = ["email", "sms"] as const;
export const lifecycleStages = ["lead", "prospect", "customer", "inactive"] as const;

export type MarketingChannel = (typeof marketingChannels)[number];
export type LifecycleStage = (typeof lifecycleStages)[number];

export type ContactTag = {
  id: string;
  name: string;
  color: string;
  contactCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type MarketingContact = {
  id: string;
  companyId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  source: string;
  lifecycleStage: LifecycleStage;
  isActive: boolean;
  tagIds: string[];
  tags: ContactTag[];
  createdAt: string;
  updatedAt: string;
};

export type ContactListResult = {
  items: MarketingContact[];
  total: number;
  page: number;
  pageSize: number;
};

export type ConsentStatus = "granted" | "revoked";

export type ConsentRecord = {
  id: string;
  companyId: string;
  contactId: string;
  channel: MarketingChannel;
  purpose: string;
  status: ConsentStatus;
  source: string;
  recordedAt: string;
  withdrawnAt?: string;
  recordedByUserId?: string;
};

export type AudienceSelectionRule = {
  activeOnly?: boolean;
  lifecycleStages?: LifecycleStage[];
  sources?: string[];
  tagIds?: string[];
  requireConsentChannel?: MarketingChannel;
  requireConsentPurpose?: string;
};

export type Audience = {
  id: string;
  companyId: string;
  name: string;
  description: string;
  selectionRule?: AudienceSelectionRule;
  isActive: boolean;
  memberCount: number;
  eligibleCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CampaignTemplate = {
  id: string;
  companyId: string;
  name: string;
  description: string;
  channel: MarketingChannel;
  subject?: string;
  body: string;
  version: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CampaignStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "scheduled"
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type CampaignRecipientSnapshot = {
  subject?: string;
  body: string;
  templateVersion?: number;
  recipientCount: number;
  audienceSnapshotId?: string;
  snapshotAt: string;
};

export type MarketingCampaign = {
  id: string;
  companyId: string;
  name: string;
  channel: MarketingChannel;
  subject?: string;
  body: string;
  audienceId: string;
  templateId?: string;
  status: CampaignStatus;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  approvedAt?: string;
  approvedByUserId?: string;
  createdByUserId: string;
  snapshot?: CampaignRecipientSnapshot;
  createdAt: string;
  updatedAt: string;
};

export type DeliveryStatus =
  | "pending"
  | "processing"
  | "sent"
  | "delivered"
  | "bounced"
  | "failed"
  | "suppressed"
  | "cancelled";

export type CampaignDelivery = {
  id: string;
  companyId: string;
  campaignId: string;
  contactId: string;
  channel: MarketingChannel;
  destination: string;
  recipientName?: string;
  status: DeliveryStatus;
  attemptCount: number;
  nextAttemptAt?: string;
  providerMessageId?: string;
  idempotencyKey: string;
  safeError?: string;
  errorCategory?: string;
  sentAt?: string;
  deliveredAt?: string;
  failedAt?: string;
  suppressedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type CampaignEvent = {
  id: string;
  companyId: string;
  deliveryId: string;
  campaignId: string;
  provider: string;
  providerEventId?: string;
  eventType: string;
  occurredAt: string;
  eventReference?: string;
  ingestedAt: string;
};

export type SocialPlatform = "facebook" | "instagram" | "linkedin";

export type SocialAccount = {
  id: string;
  companyId: string;
  platform: SocialPlatform;
  providerAccountId: string;
  displayName: string;
  connectionStatus: "connected" | "disconnected" | "expired";
  scopes: string[];
  connectedAt: string;
  tokenExpiresAt?: string;
  updatedAt: string;
};

export type SocialPostStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed"
  | "manual_review"
  | "cancelled";

export type SocialPost = {
  id: string;
  companyId: string;
  content: string;
  platform: SocialPlatform;
  accountId?: string;
  mediaUrl?: string;
  status: SocialPostStatus;
  scheduledAt?: string;
  publishedAt?: string;
  providerPostId?: string;
  safeError?: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type AICopyGeneration = {
  id: string;
  companyId: string;
  requestedByUserId: string;
  productDescription: string;
  targetAudience: string;
  channel: string;
  tone: string;
  generatedContent: string;
  variations: Array<{ title?: string; body: string; callToAction?: string; hashtags: string[] }>;
  status: "completed" | "failed" | "configuration_unavailable";
  safeError?: string;
  provider?: string;
  model?: string;
  createdAt: string;
};

export type MarketingAnalytics = {
  contacts: {
    total: number;
    active: number;
    byStage: Record<LifecycleStage, number>;
  };
  audiences: {
    total: number;
    totalEligibleEmail: number;
  };
  campaigns: {
    total: number;
    byStatus: Record<string, number>;
  };
  deliveries: {
    total: number;
    byStatus: Record<string, number>;
    deliveryRate: number | null;
  };
  social: {
    accountsConnected: number;
    postsByStatus: Record<string, number>;
  };
  ai: {
    totalGenerations: number;
  };
};
