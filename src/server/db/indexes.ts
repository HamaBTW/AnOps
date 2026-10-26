import "server-only";
import type { Db, IndexDescription } from "mongodb";
import { COLLECTIONS } from "@/server/db/documents";
import { AppError } from "@/shared/lib/errors";

/**
 * Index definitions for every company-scoped collection (HR, inventory, purchasing, manufacturing),
 * plus the company membership and audit collections they depend on. Every index is idempotent, and
 * ensureIndexes runs once per database connection before the first workspace access.
 *
 * Tenant-scoped indexes lead with companyId because every query filters on it.
 */
const INDEXES: Record<string, IndexDescription[]> = {
  // Tenant boundary. The slug index is partial so legacy documents without a slug do not collide.
  [COLLECTIONS.companies]: [
    { key: { slug: 1 }, name: "company_slug_unique", unique: true, partialFilterExpression: { slug: { $exists: true } } },
  ],
  [COLLECTIONS.companyMembers]: [
    { key: { companyId: 1, userId: 1 }, name: "member_company_user_unique", unique: true },
    { key: { userId: 1, status: 1 }, name: "member_user_status" },
  ],
  [COLLECTIONS.auditEvents]: [
    { key: { companyId: 1, occurredAt: -1 }, name: "audit_company_time" },
    { key: { companyId: 1, entityType: 1, entityId: 1, occurredAt: -1 }, name: "audit_entity" },
  ],
  [COLLECTIONS.inventoryCategories]: [
    { key: { companyId: 1, normalizedName: 1 }, name: "category_name_unique", unique: true },
    { key: { companyId: 1, isActive: 1, normalizedName: 1 }, name: "category_list" },
  ],
  [COLLECTIONS.inventoryProducts]: [
    { key: { companyId: 1, normalizedSku: 1 }, name: "product_sku_unique", unique: true },
    { key: { companyId: 1, isActive: 1, normalizedName: 1 }, name: "product_list_name" },
    { key: { companyId: 1, normalizedName: 1 }, name: "product_name_prefix" },
    { key: { companyId: 1, categoryId: 1, isActive: 1 }, name: "product_category" },
  ],
  [COLLECTIONS.inventoryWarehouses]: [
    { key: { companyId: 1, normalizedCode: 1 }, name: "warehouse_code_unique", unique: true },
    { key: { companyId: 1, isActive: 1, name: 1 }, name: "warehouse_list" },
  ],
  [COLLECTIONS.inventoryStockBalances]: [
    {
      key: { companyId: 1, productId: 1, warehouseId: 1 },
      name: "balance_product_warehouse_unique",
      unique: true,
    },
    { key: { companyId: 1, warehouseId: 1, onHandMicro: 1 }, name: "balance_warehouse_level" },
    { key: { companyId: 1, productId: 1 }, name: "balance_product" },
  ],
  [COLLECTIONS.inventoryStockMovements]: [
    { key: { companyId: 1, productId: 1, createdAt: -1 }, name: "movement_product_time" },
    { key: { companyId: 1, warehouseId: 1, createdAt: -1 }, name: "movement_warehouse_time" },
    { key: { companyId: 1, sourceType: 1, sourceId: 1 }, name: "movement_source" },
    { key: { companyId: 1, createdAt: -1 }, name: "movement_company_time" },
  ],
  [COLLECTIONS.purchaseSuppliers]: [
    { key: { companyId: 1, normalizedName: 1 }, name: "supplier_name_unique", unique: true },
    { key: { companyId: 1, isActive: 1, normalizedName: 1 }, name: "supplier_list" },
  ],
  [COLLECTIONS.purchaseOrders]: [
    { key: { companyId: 1, orderNumber: 1 }, name: "po_number_unique", unique: true },
    { key: { companyId: 1, status: 1, createdAt: -1 }, name: "po_status_time" },
    { key: { companyId: 1, supplierId: 1, createdAt: -1 }, name: "po_supplier_time" },
  ],
  [COLLECTIONS.goodsReceipts]: [
    { key: { companyId: 1, receiptNumber: 1 }, name: "gr_number_unique", unique: true },
    { key: { companyId: 1, purchaseOrderId: 1, status: 1 }, name: "gr_order_status" },
    { key: { companyId: 1, status: 1, createdAt: -1 }, name: "gr_status_time" },
  ],
  [COLLECTIONS.manufacturingBoms]: [
    { key: { companyId: 1, finishedProductId: 1, revision: -1 }, name: "bom_revision_unique", unique: true },
    {
      key: { companyId: 1, finishedProductId: 1 },
      name: "bom_one_active_per_product",
      unique: true,
      partialFilterExpression: { status: "active" },
    },
    { key: { companyId: 1, status: 1, updatedAt: -1 }, name: "bom_status_time" },
  ],
  [COLLECTIONS.manufacturingWorkOrders]: [
    { key: { companyId: 1, orderNumber: 1 }, name: "wo_number_unique", unique: true },
    { key: { companyId: 1, status: 1, createdAt: -1 }, name: "wo_status_time" },
  ],
  [COLLECTIONS.marketingContacts]: [
    {
      key: { companyId: 1, normalizedEmail: 1 },
      name: "contact_company_email_unique",
      unique: true,
      partialFilterExpression: { normalizedEmail: { $type: "string" } },
    },
    {
      key: { companyId: 1, normalizedPhone: 1 },
      name: "contact_company_phone_unique",
      unique: true,
      partialFilterExpression: { normalizedPhone: { $type: "string" } },
    },
    { key: { companyId: 1, isActive: 1, updatedAt: -1 }, name: "contact_active_updated" },
    { key: { companyId: 1, lifecycleStage: 1, source: 1 }, name: "contact_stage_source" },
  ],
  [COLLECTIONS.marketingTags]: [
    { key: { companyId: 1, normalizedName: 1 }, name: "tag_company_name_unique", unique: true },
    { key: { companyId: 1, createdAt: -1 }, name: "tag_company_time" },
  ],
  [COLLECTIONS.marketingTagAssignments]: [
    { key: { companyId: 1, contactId: 1, tagId: 1 }, name: "tag_assignment_unique", unique: true },
    { key: { companyId: 1, tagId: 1 }, name: "tag_assignment_by_tag" },
    { key: { companyId: 1, contactId: 1 }, name: "tag_assignment_by_contact" },
  ],
  [COLLECTIONS.marketingConsents]: [
    { key: { companyId: 1, contactId: 1, channel: 1, purpose: 1, recordedAt: -1 }, name: "consent_history" },
    { key: { companyId: 1, contactId: 1, channel: 1, status: 1 }, name: "consent_status" },
  ],
  [COLLECTIONS.marketingAudiences]: [
    { key: { companyId: 1, name: 1 }, name: "audience_company_name_unique", unique: true },
    { key: { companyId: 1, isActive: 1, updatedAt: -1 }, name: "audience_active_updated" },
  ],
  [COLLECTIONS.marketingAudienceMembers]: [
    { key: { companyId: 1, audienceId: 1, contactId: 1 }, name: "audience_member_unique", unique: true },
    { key: { companyId: 1, audienceId: 1 }, name: "audience_member_by_audience" },
  ],
  [COLLECTIONS.marketingTemplates]: [
    { key: { companyId: 1, channel: 1, name: 1, version: 1 }, name: "template_channel_name_version_unique", unique: true },
    { key: { companyId: 1, archived: 1, updatedAt: -1 }, name: "template_active_updated" },
  ],
  [COLLECTIONS.marketingCampaigns]: [
    { key: { companyId: 1, status: 1, scheduledAt: 1 }, name: "campaign_status_scheduled" },
    { key: { companyId: 1, createdAt: -1 }, name: "campaign_created" },
  ],
  [COLLECTIONS.marketingCampaignDeliveries]: [
    { key: { companyId: 1, campaignId: 1, contactId: 1 }, name: "delivery_campaign_contact_unique", unique: true },
    { key: { companyId: 1, idempotencyKey: 1 }, name: "delivery_company_idempotency_unique", unique: true },
    { key: { status: 1, nextAttemptAt: 1, leaseExpiresAt: 1 }, name: "delivery_worker_claim" },
    { key: { companyId: 1, campaignId: 1, status: 1 }, name: "delivery_campaign_status" },
  ],
  [COLLECTIONS.marketingCampaignEvents]: [
    { key: { provider: 1, providerEventId: 1 }, name: "campaign_event_provider_unique", unique: true, sparse: true },
    { key: { companyId: 1, deliveryId: 1, occurredAt: -1 }, name: "campaign_event_delivery" },
  ],
  [COLLECTIONS.marketingSocialAccounts]: [
    { key: { companyId: 1, platform: 1, providerAccountId: 1 }, name: "social_account_unique", unique: true },
    { key: { companyId: 1, connectionStatus: 1 }, name: "social_account_status" },
  ],
  [COLLECTIONS.marketingSocialPosts]: [
    { key: { companyId: 1, status: 1, scheduledAt: 1 }, name: "social_post_status_scheduled" },
    { key: { status: 1, scheduledAt: 1, socialLeaseExpiresAt: 1 }, name: "social_post_worker_claim" },
  ],
  [COLLECTIONS.marketingSocialPublishAttempts]: [
    { key: { companyId: 1, postId: 1, attemptNumber: 1 }, name: "social_attempt_unique", unique: true },
  ],
  [COLLECTIONS.marketingAiGenerations]: [
    { key: { companyId: 1, createdAt: -1 }, name: "ai_generation_time" },
  ],
};

const initialized = new WeakMap<Db, Promise<void>>();

/** Creates the module indexes once per Db instance. Safe to call on every request. */
export function ensureIndexes(db: Db): Promise<void> {
  let pending = initialized.get(db);
  if (!pending) {
    pending = createAll(db).catch((error: unknown) => {
      initialized.delete(db);
      console.error("[db] index initialization failed", error instanceof Error ? error.name : "unknown");
      throw new AppError("INTERNAL", "Database is not ready. Please try again shortly.");
    });
    initialized.set(db, pending);
  }
  return pending;
}

async function createAll(db: Db): Promise<void> {
  for (const [collectionName, indexes] of Object.entries(INDEXES)) {
    try {
      await db.collection(collectionName).createIndexes(indexes);
    } catch (error: any) {
      if (error && (error.code === 85 || error.codeName === "IndexOptionsConflict")) {
        console.warn(`[db] index option conflict on ${collectionName}, creating individually...`);
        for (const idx of indexes) {
          try {
            await db.collection(collectionName).createIndex(idx.key, idx as any);
          } catch (inner: any) {
            console.warn(`[db] skipped index "${idx.name}" on ${collectionName}: ${inner?.message}`);
          }
        }
      } else {
        throw error;
      }
    }
  }
}

/** Exposed for tests and migration tooling. */
export const INDEX_DEFINITIONS = INDEXES;
