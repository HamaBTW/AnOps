import "server-only";
import type { Db, IndexDescription } from "mongodb";
import { COLLECTIONS } from "@/server/db/documents";
import { AppError } from "@/shared/lib/errors";

/**
 * Index definitions for the inventory, purchasing, and manufacturing modules plus
 * the tenancy and audit collections they depend on. Every index is idempotent, and
 * ensureIndexes runs once per database connection before the first workspace access.
 *
 * Tenant-scoped indexes lead with companyId because every query filters on it.
 */
const INDEXES: Record<string, IndexDescription[]> = {
  [COLLECTIONS.organizations]: [{ key: { slug: 1 }, name: "org_slug_unique", unique: true }],
  [COLLECTIONS.companies]: [
    { key: { organizationId: 1, isActive: 1, createdAt: 1 }, name: "company_org_active" },
  ],
  [COLLECTIONS.memberships]: [
    { key: { organizationId: 1, userId: 1 }, name: "membership_org_user_unique", unique: true },
    {
      key: { userId: 1 },
      name: "membership_personal_unique",
      unique: true,
      partialFilterExpression: { isPersonal: true },
    },
    { key: { userId: 1, status: 1, createdAt: 1 }, name: "membership_user_status" },
  ],
  [COLLECTIONS.auditEvents]: [
    { key: { organizationId: 1, occurredAt: -1 }, name: "audit_org_time" },
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
