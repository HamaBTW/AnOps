import "server-only";
import type { ObjectId } from "mongodb";
import type { UnitOfMeasure } from "@/shared/domain/units";

export { UNITS_OF_MEASURE, type UnitOfMeasure } from "@/shared/domain/units";

/**
 * Persistence shapes. These are internal: never return them from actions or
 * route handlers. Map them to DTOs in the feature mappers instead.
 *
 * Money is stored in milli-units (see shared/lib/fixed-point.ts). Quantities are
 * stored in micro-units. Both are integers.
 */

export const COLLECTIONS = {
  /** Tenant boundary. One document per company; shared with features/company (the multi-tenant model). */
  companies: "companies",
  companyMembers: "company_members",
  counters: "counters",
  auditEvents: "audit_events",
  inventoryCategories: "inventory_categories",
  inventoryProducts: "inventory_products",
  inventoryWarehouses: "inventory_warehouses",
  inventoryStockBalances: "inventory_stock_balances",
  inventoryStockMovements: "inventory_stock_movements",
  purchaseSuppliers: "purchase_suppliers",
  purchaseOrders: "purchase_orders",
  goodsReceipts: "goods_receipts",
  manufacturingBoms: "manufacturing_boms",
  manufacturingWorkOrders: "manufacturing_work_orders",
} as const;

/** Every tenant-owned document carries exactly this scope. There is no other tenancy level. */
export type TenantScope = {
  companyId: ObjectId;
};

export type AuditEventDoc = {
  _id: ObjectId;
  companyId: ObjectId | null;
  actorUserId: ObjectId;
  action: string;
  entityType: string;
  entityId: string;
  outcome: "success" | "failure";
  requestId: string;
  metadata: Record<string, string | number | boolean>;
  occurredAt: Date;
};

export type CounterDoc = {
  _id: string;
  seq: number;
};

export type ProductCategoryDoc = TenantScope & {
  _id: ObjectId;
  name: string;
  normalizedName: string;
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductDoc = TenantScope & {
  _id: ObjectId;
  categoryId: ObjectId | null;
  sku: string;
  normalizedSku: string;
  name: string;
  normalizedName: string;
  description: string;
  unitOfMeasure: UnitOfMeasure;
  isStorable: boolean;
  isActive: boolean;
  /** Standard cost used for stock valuation, milli-units. */
  costMilli: number;
  /** List sale price, milli-units. Informational until sales are integrated. */
  salePriceMilli: number;
  /** Stock level at or below which the product is flagged as low stock, micro-units. */
  reorderPointMicro: number;
  createdAt: Date;
  updatedAt: Date;
  version: number;
};

export type WarehouseDoc = TenantScope & {
  _id: ObjectId;
  name: string;
  code: string;
  normalizedCode: string;
  address: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/** Projection of the movement ledger. Only the stock service writes this collection. */
export type StockBalanceDoc = TenantScope & {
  _id: ObjectId;
  productId: ObjectId;
  warehouseId: ObjectId;
  onHandMicro: number;
  updatedAt: Date;
};

export type StockMovementType =
  | "receipt"
  | "issue"
  | "adjustment"
  | "transfer_out"
  | "transfer_in"
  | "production_consume"
  | "production_output";

export type StockMovementSourceType =
  | "manual"
  | "goods_receipt"
  | "transfer"
  | "work_order";

/** Append-only. Documents are never updated or deleted by the application. */
export type StockMovementDoc = TenantScope & {
  _id: ObjectId;
  productId: ObjectId;
  warehouseId: ObjectId;
  movementType: StockMovementType;
  /** Signed change in micro-units. */
  deltaMicro: number;
  sourceType: StockMovementSourceType;
  sourceId: ObjectId | null;
  reason: string;
  actorUserId: ObjectId;
  createdAt: Date;
};

export type SupplierDoc = TenantScope & {
  _id: ObjectId;
  name: string;
  normalizedName: string;
  email: string;
  phone: string;
  taxIdentifier: string;
  address: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type PurchaseOrderStatus =
  | "draft"
  | "approved"
  | "partially_received"
  | "received"
  | "cancelled";

export type PurchaseOrderLineSub = {
  _id: ObjectId;
  productId: ObjectId;
  sku: string;
  productName: string;
  unitOfMeasure: UnitOfMeasure;
  orderedMicro: number;
  receivedMicro: number;
  unitCostMilli: number;
  taxRateBps: number;
  lineSubtotalMilli: number;
  lineTaxMilli: number;
};

export type PurchaseOrderDoc = TenantScope & {
  _id: ObjectId;
  supplierId: ObjectId;
  supplierName: string;
  orderNumber: string;
  status: PurchaseOrderStatus;
  currencyCode: string;
  expectedDate: Date | null;
  notes: string;
  lines: PurchaseOrderLineSub[];
  subtotalMilli: number;
  taxMilli: number;
  totalMilli: number;
  createdBy: ObjectId;
  approvedBy: ObjectId | null;
  approvedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
};

export type GoodsReceiptStatus = "draft" | "posted" | "cancelled";

export type GoodsReceiptLineSub = {
  purchaseOrderLineId: ObjectId;
  productId: ObjectId;
  sku: string;
  productName: string;
  unitOfMeasure: UnitOfMeasure;
  quantityMicro: number;
};

export type GoodsReceiptDoc = TenantScope & {
  _id: ObjectId;
  purchaseOrderId: ObjectId;
  orderNumber: string;
  supplierId: ObjectId;
  supplierName: string;
  warehouseId: ObjectId;
  receiptNumber: string;
  status: GoodsReceiptStatus;
  lines: GoodsReceiptLineSub[];
  createdBy: ObjectId;
  postedBy: ObjectId | null;
  postedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
};

export type BomStatus = "draft" | "active" | "archived";

export type BomComponentSub = {
  productId: ObjectId;
  sku: string;
  productName: string;
  unitOfMeasure: UnitOfMeasure;
  /** Component quantity required per one unit of the finished product, micro-units. */
  quantityPerUnitMicro: number;
};

export type BomDoc = TenantScope & {
  _id: ObjectId;
  finishedProductId: ObjectId;
  finishedSku: string;
  finishedName: string;
  revision: number;
  status: BomStatus;
  components: BomComponentSub[];
  notes: string;
  createdBy: ObjectId;
  activatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
};

export type WorkOrderStatus = "draft" | "in_progress" | "completed" | "cancelled";

export type WorkOrderComponentSub = {
  productId: ObjectId;
  sku: string;
  productName: string;
  unitOfMeasure: UnitOfMeasure;
  /** Planned requirement, computed at creation from the BOM snapshot. Micro-units. */
  plannedMicro: number;
  /** Actual consumption, recorded at completion. Micro-units. */
  consumedMicro: number;
};

export type WorkOrderDoc = TenantScope & {
  _id: ObjectId;
  orderNumber: string;
  bomId: ObjectId;
  bomRevision: number;
  finishedProductId: ObjectId;
  finishedSku: string;
  finishedName: string;
  warehouseId: ObjectId;
  plannedQuantityMicro: number;
  producedQuantityMicro: number;
  status: WorkOrderStatus;
  components: WorkOrderComponentSub[];
  plannedStart: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  createdBy: ObjectId;
  completedBy: ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
};
