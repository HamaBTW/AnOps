export const marketingChannels = ["email", "sms"] as const;
export const lifecycleStages = ["lead", "prospect", "customer", "inactive"] as const;

export type MarketingChannel = (typeof marketingChannels)[number];
export type LifecycleStage = (typeof lifecycleStages)[number];

export type ContactTag = { id: string; name: string; color: string };
export type MarketingContact = {
  id: string;
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

export type Audience = { id: string; name: string; description: string; isActive: boolean; memberCount: number; eligibleCount: number; createdAt: string; updatedAt: string };
export type ConsentRecord = { id: string; channel: MarketingChannel; purpose: string; status: "granted" | "revoked"; source: string; recordedAt: string; withdrawnAt?: string };
export type CampaignStatus = "draft" | "pending_approval" | "approved" | "scheduled" | "cancelled" | "failed";
export type MarketingCampaign = { id: string; name: string; channel: MarketingChannel; subject?: string; body: string; audienceId: string; status: CampaignStatus; scheduledAt?: string; approvedAt?: string; snapshot?: { subject?: string; body: string; recipientCount: number }; createdAt: string; updatedAt: string };
