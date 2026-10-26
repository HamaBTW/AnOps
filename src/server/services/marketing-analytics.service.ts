import "server-only";

import { COLLECTIONS } from "@/server/db/documents";
import { ensureIndexes } from "@/server/db/indexes";
import type { WorkspaceContext } from "@/server/tenancy/workspace";
import { assertPermission, PERMISSIONS } from "@/server/security/permissions";
import type { MarketingAnalytics, LifecycleStage } from "@/features/marketing/types";

export async function getMarketingAnalytics(ctx: WorkspaceContext): Promise<MarketingAnalytics> {
  assertPermission(ctx.permissions, PERMISSIONS.MARKETING_READ);
  await ensureIndexes(ctx.db);

  const [
    totalContacts,
    activeContacts,
    stageAgg,
    totalAudiences,
    eligibleAgg,
    campaignAgg,
    deliveryAgg,
    connectedAccounts,
    socialAgg,
    totalAiGenerations,
  ] = await Promise.all([
    ctx.db.collection(COLLECTIONS.marketingContacts).countDocuments({ companyId: ctx.companyId }),
    ctx.db.collection(COLLECTIONS.marketingContacts).countDocuments({ companyId: ctx.companyId, isActive: true }),
    ctx.db.collection(COLLECTIONS.marketingContacts).aggregate([
      { $match: { companyId: ctx.companyId } },
      { $group: { _id: "$lifecycleStage", count: { $sum: 1 } } },
    ]).toArray(),
    ctx.db.collection(COLLECTIONS.marketingAudiences).countDocuments({ companyId: ctx.companyId }),
    ctx.db.collection(COLLECTIONS.marketingConsents).aggregate([
      { $match: { companyId: ctx.companyId, channel: "email", status: "granted" } },
      { $group: { _id: "$contactId" } },
      { $count: "count" },
    ]).toArray(),
    ctx.db.collection(COLLECTIONS.marketingCampaigns).aggregate([
      { $match: { companyId: ctx.companyId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]).toArray(),
    ctx.db.collection(COLLECTIONS.marketingCampaignDeliveries).aggregate([
      { $match: { companyId: ctx.companyId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]).toArray(),
    ctx.db.collection(COLLECTIONS.marketingSocialAccounts).countDocuments({ companyId: ctx.companyId, connectionStatus: "connected" }),
    ctx.db.collection(COLLECTIONS.marketingSocialPosts).aggregate([
      { $match: { companyId: ctx.companyId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]).toArray(),
    ctx.db.collection(COLLECTIONS.marketingAiGenerations).countDocuments({ companyId: ctx.companyId }),
  ]);

  const byStage: Record<LifecycleStage, number> = {
    lead: 0,
    prospect: 0,
    customer: 0,
    inactive: 0,
  };
  for (const item of stageAgg) {
    if (item._id in byStage) {
      byStage[item._id as LifecycleStage] = Number(item.count);
    }
  }

  const campaignsByStatus: Record<string, number> = {};
  for (const item of campaignAgg) {
    campaignsByStatus[String(item._id)] = Number(item.count);
  }

  const deliveriesByStatus: Record<string, number> = {};
  let totalDeliveries = 0;
  for (const item of deliveryAgg) {
    const count = Number(item.count);
    deliveriesByStatus[String(item._id)] = count;
    totalDeliveries += count;
  }

  const deliveredCount = deliveriesByStatus.delivered ?? deliveriesByStatus.sent ?? 0;
  const deliveryRate = totalDeliveries > 0 ? (deliveredCount / totalDeliveries) * 100 : null;

  const postsByStatus: Record<string, number> = {};
  for (const item of socialAgg) {
    postsByStatus[String(item._id)] = Number(item.count);
  }

  return {
    contacts: {
      total: totalContacts,
      active: activeContacts,
      byStage,
    },
    audiences: {
      total: totalAudiences,
      totalEligibleEmail: eligibleAgg[0]?.count ?? 0,
    },
    campaigns: {
      total: Object.values(campaignsByStatus).reduce((a, b) => a + b, 0),
      byStatus: campaignsByStatus,
    },
    deliveries: {
      total: totalDeliveries,
      byStatus: deliveriesByStatus,
      deliveryRate: deliveryRate ? Math.round(deliveryRate * 10) / 10 : null,
    },
    social: {
      accountsConnected: connectedAccounts,
      postsByStatus,
    },
    ai: {
      totalGenerations: totalAiGenerations,
    },
  };
}
