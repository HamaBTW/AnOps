import "server-only";
import type { Db, IndexDescription } from "mongodb";
import { COLLECTIONS } from "@/server/db/documents";
import { AppError } from "@/shared/lib/errors";
import { MARKETING_INDEXES } from "@/server/marketing/indexes";

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
    // At most one purchase order per replenishment proposal. The database enforces it, so a late or
    // duplicate conversion write cannot create a second order.
    {
      key: { companyId: 1, sourceReplenishmentProposalId: 1 },
      name: "po_replenishment_source_unique",
      unique: true,
      partialFilterExpression: { sourceReplenishmentProposalId: { $exists: true } },
    },
  ],
  [COLLECTIONS.purchaseReplenishmentProposals]: [
    { key: { companyId: 1, status: 1, generatedAt: -1 }, name: "replenishment_status_time" },
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
  [COLLECTIONS.aiSettings]: [{ key: { companyId: 1 }, name: "ai_settings_company_unique", unique: true }],
  [COLLECTIONS.aiAccessGrants]: [
    { key: { companyId: 1, userId: 1 }, name: "ai_grant_member_unique", unique: true },
    { key: { companyId: 1, enabled: 1 }, name: "ai_grant_enabled" },
  ],
  [COLLECTIONS.aiConversations]: [
    { key: { companyId: 1, userId: 1, updatedAt: -1 }, name: "ai_conversation_owner_time" },
    // Retention: documents leave when expiresAt passes. The service sets expiresAt on every write.
    { key: { expiresAt: 1 }, name: "ai_conversation_ttl", expireAfterSeconds: 0 },
  ],
  [COLLECTIONS.aiPendingActions]: [
    { key: { companyId: 1, userId: 1, status: 1, createdAt: -1 }, name: "ai_pending_owner_status" },
    // Outcome rows stay a day past expiry so a late confirm gets a precise answer, then they are removed.
    { key: { expiresAt: 1 }, name: "ai_pending_ttl", expireAfterSeconds: 86_400 },
  ],
  [COLLECTIONS.aiUsage]: [
    { key: { companyId: 1, day: 1, userId: 1 }, name: "ai_usage_day_member_unique", unique: true },
  ],
  [COLLECTIONS.aiNotices]: [
    { key: { companyId: 1, userId: 1, createdAt: -1 }, name: "ai_notice_owner_time" },
    { key: { expiresAt: 1 }, name: "ai_notice_ttl", expireAfterSeconds: 0 },
  ],
  ...MARKETING_INDEXES,
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
    await db.collection(collectionName).createIndexes(indexes);
  }
}

/** Exposed for tests and migration tooling. */
export const INDEX_DEFINITIONS = INDEXES;
