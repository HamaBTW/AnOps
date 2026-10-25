import "server-only";
import type { CompanyRole } from "@/features/company/types";
import { AppError } from "@/shared/lib/errors";

/**
 * Central permission catalogue for every company-scoped module (HR, inventory, purchasing,
 * manufacturing). Permissions are granted through the user's role in the active company.
 * Every service asserts the permission it needs, so a hidden button is never the only control.
 */
export const PERMISSIONS = {
  HR_READ: "hr.read",
  HR_MANAGE: "hr.manage",
  HR_ATTENDANCE_RECORD: "hr.attendance.record",
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
  FINANCE_READ: "finance.read",
  FINANCE_CUSTOMER_MANAGE: "finance.customer.manage",
  FINANCE_INVOICE_MANAGE: "finance.invoice.manage",
  FINANCE_INVOICE_POST: "finance.invoice.post",
  FINANCE_PAYMENT_ALLOCATE: "finance.payment.allocate",
  FINANCE_EXPENSE_MANAGE: "finance.expense.manage",
  FINANCE_EXPENSE_APPROVE: "finance.expense.approve",
  FINANCE_EXPENSE_PAY: "finance.expense.pay",
  FINANCE_RECEIPT_OCR: "finance.receipt.ocr",
  FINANCE_REPORT_VIEW: "finance.report.view",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Workspace roles used by the permission catalogue. Mapped from the company role; see docs/ROLES_AND_PERMISSIONS.md. */
export type WorkspaceRole = "owner" | "admin" | "operator" | "viewer";

/** company owner/admin keep their rank; company manager operates; company employee is read-only. */
export function workspaceRoleFor(companyRole: CompanyRole): WorkspaceRole {
  switch (companyRole) {
    case "owner":
      return "owner";
    case "admin":
      return "admin";
    case "manager":
      return "operator";
    case "employee":
      return "viewer";
  }
}

const ALL_PERMISSIONS = Object.values(PERMISSIONS) as Permission[];

const READ_PERMISSIONS: Permission[] = [
  PERMISSIONS.HR_READ,
  PERMISSIONS.INVENTORY_READ,
  PERMISSIONS.PURCHASING_READ,
  PERMISSIONS.MANUFACTURING_READ,
  PERMISSIONS.FINANCE_READ,
  PERMISSIONS.FINANCE_REPORT_VIEW,
];

/**
 * owner/admin: full control, including approvals, manual stock adjustments and HR administration.
 * operator (company manager): day-to-day execution: staff, job titles, attendance, stock moves,
 *   receipts, production. Cannot approve purchase orders or adjust stock counts.
 * viewer (company employee): read-only access to company data.
 */
const ROLE_PERMISSIONS: Record<WorkspaceRole, readonly Permission[]> = {
  owner: ALL_PERMISSIONS,
  admin: ALL_PERMISSIONS,
  operator: [
    ...READ_PERMISSIONS,
    PERMISSIONS.HR_MANAGE,
    PERMISSIONS.HR_ATTENDANCE_RECORD,
    PERMISSIONS.INVENTORY_PRODUCT_MANAGE,
    PERMISSIONS.INVENTORY_WAREHOUSE_MANAGE,
    PERMISSIONS.INVENTORY_STOCK_MOVE,
    PERMISSIONS.PURCHASING_SUPPLIER_MANAGE,
    PERMISSIONS.PURCHASING_ORDER_MANAGE,
    PERMISSIONS.PURCHASING_RECEIPT_POST,
    PERMISSIONS.MANUFACTURING_BOM_MANAGE,
    PERMISSIONS.MANUFACTURING_WORK_ORDER_MANAGE,
    PERMISSIONS.MANUFACTURING_WORK_ORDER_EXECUTE,
    PERMISSIONS.FINANCE_CUSTOMER_MANAGE,
    PERMISSIONS.FINANCE_INVOICE_MANAGE,
    PERMISSIONS.FINANCE_EXPENSE_MANAGE,
    PERMISSIONS.FINANCE_RECEIPT_OCR,
  ],
  viewer: [...READ_PERMISSIONS],
};

export function permissionsForRole(role: WorkspaceRole): ReadonlySet<Permission> {
  return new Set(ROLE_PERMISSIONS[role]);
}

export function assertPermission(permissions: ReadonlySet<Permission>, permission: Permission): void {
  if (!permissions.has(permission)) {
    throw new AppError("FORBIDDEN", "You do not have permission to perform this action.");
  }
}
