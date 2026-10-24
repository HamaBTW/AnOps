import "server-only";
import type { MembershipDoc } from "@/server/db/documents";
import { AppError } from "@/shared/lib/errors";

/**
 * Central permission catalogue for the inventory, purchasing, and manufacturing
 * modules. Permissions are granted through membership roles. Every service asserts
 * the permission it needs, so a UI button being hidden is never the only control.
 */
export const PERMISSIONS = {
  INVENTORY_READ: "inventory.read",
  INVENTORY_PRODUCT_MANAGE: "inventory.product.manage",
  INVENTORY_WAREHOUSE_MANAGE: "inventory.warehouse.manage",
  INVENTORY_STOCK_MOVE: "inventory.stock.move",
  INVENTORY_STOCK_ADJUST: "inventory.stock.adjust",
  PURCHASING_READ: "purchasing.read",
  PURCHASING_SUPPLIER_MANAGE: "purchasing.supplier.manage",
  PURCHASING_ORDER_MANAGE: "purchasing.order.manage",
  PURCHASING_ORDER_APPROVE: "purchasing.order.approve",
  PURCHASING_RECEIPT_POST: "purchasing.receipt.post",
  MANUFACTURING_READ: "manufacturing.read",
  MANUFACTURING_BOM_MANAGE: "manufacturing.bom.manage",
  MANUFACTURING_WORK_ORDER_MANAGE: "manufacturing.work_order.manage",
  MANUFACTURING_WORK_ORDER_EXECUTE: "manufacturing.work_order.execute",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
export type MembershipRole = MembershipDoc["role"];

const ALL_PERMISSIONS = Object.values(PERMISSIONS) as Permission[];

const READ_PERMISSIONS: Permission[] = [
  PERMISSIONS.INVENTORY_READ,
  PERMISSIONS.PURCHASING_READ,
  PERMISSIONS.MANUFACTURING_READ,
];

/**
 * owner/admin: full control, including approvals and manual stock adjustments.
 * operator: day-to-day execution (master data, stock moves, receipts, production),
 *           but cannot approve purchase orders or adjust stock counts.
 * viewer: read-only.
 */
const ROLE_PERMISSIONS: Record<MembershipRole, readonly Permission[]> = {
  owner: ALL_PERMISSIONS,
  admin: ALL_PERMISSIONS,
  operator: [
    ...READ_PERMISSIONS,
    PERMISSIONS.INVENTORY_PRODUCT_MANAGE,
    PERMISSIONS.INVENTORY_WAREHOUSE_MANAGE,
    PERMISSIONS.INVENTORY_STOCK_MOVE,
    PERMISSIONS.PURCHASING_SUPPLIER_MANAGE,
    PERMISSIONS.PURCHASING_ORDER_MANAGE,
    PERMISSIONS.PURCHASING_RECEIPT_POST,
    PERMISSIONS.MANUFACTURING_BOM_MANAGE,
    PERMISSIONS.MANUFACTURING_WORK_ORDER_MANAGE,
    PERMISSIONS.MANUFACTURING_WORK_ORDER_EXECUTE,
  ],
  viewer: [...READ_PERMISSIONS],
};

export function permissionsForRole(role: MembershipRole): ReadonlySet<Permission> {
  return new Set(ROLE_PERMISSIONS[role]);
}

export function assertPermission(
  permissions: ReadonlySet<Permission>,
  permission: Permission
): void {
  if (!permissions.has(permission)) {
    throw new AppError("FORBIDDEN", "You do not have permission to perform this action.");
  }
}
