import { z } from "zod";
import {
  moneySchema,
  objectIdSchema,
  optionalText,
  pageSchema,
  positiveQuantitySchema,
  requiredText,
} from "@/shared/lib/schema-primitives";

export const PURCHASE_ORDER_PAGE_SIZE = 25;
export const MAX_PURCHASE_ORDER_LINES = 100;

export const supplierInputSchema = z
  .object({
    name: requiredText(120, "Supplier name"),
    email: z
      .string()
      .trim()
      .max(160)
      .refine((value) => value === "" || z.email().safeParse(value).success, "Enter a valid email address"),
    phone: optionalText(40),
    taxIdentifier: optionalText(60),
    address: optionalText(300),
    isActive: z.boolean(),
  })
  .strict();

export type SupplierInput = z.infer<typeof supplierInputSchema>;

const orderLineSchema = z
  .object({
    productId: objectIdSchema,
    quantity: positiveQuantitySchema,
    unitCost: moneySchema,
    taxRate: z
      .string()
      .trim()
      .regex(/^\d{1,2}(\.\d{1,2})?$/, "Tax rate must be a percentage such as 0, 19 or 7.5"),
  })
  .strict();

const purchaseOrderShape = z
  .object({
    supplierId: objectIdSchema,
    expectedDate: z
      .string()
      .trim()
      .regex(/^(\d{4}-\d{2}-\d{2})?$/, "Use a valid date")
      .refine((value) => value === "" || !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), "Use a valid date"),
    notes: optionalText(1000),
    lines: z
      .array(orderLineSchema)
      .min(1, "Add at least one product line")
      .max(MAX_PURCHASE_ORDER_LINES, `An order can contain at most ${MAX_PURCHASE_ORDER_LINES} lines`),
  })
  .strict();

function checkUniqueProducts(
  value: { lines: { productId: string }[] },
  ctx: z.RefinementCtx
): void {
  const seen = new Set<string>();
  value.lines.forEach((line, index) => {
    if (seen.has(line.productId)) {
      ctx.addIssue({
        code: "custom",
        path: ["lines", index, "productId"],
        message: "Each product can appear only once per order",
      });
    }
    seen.add(line.productId);
  });
}

export const purchaseOrderInputSchema = purchaseOrderShape.superRefine(checkUniqueProducts);

export type PurchaseOrderInput = z.infer<typeof purchaseOrderInputSchema>;

/** Edits carry the version the user saw so stale drafts cannot overwrite newer changes. */
export const purchaseOrderUpdateSchema = purchaseOrderShape
  .extend({ expectedVersion: z.number().int().min(1) })
  .strict()
  .superRefine(checkUniqueProducts);

export type PurchaseOrderUpdateInput = z.infer<typeof purchaseOrderUpdateSchema>;

export const receiptInputSchema = z
  .object({
    purchaseOrderId: objectIdSchema,
    warehouseId: objectIdSchema,
    lines: z
      .array(
        z
          .object({
            purchaseOrderLineId: objectIdSchema,
            quantity: z
              .string()
              .trim()
              .regex(/^\d{1,6}(\.\d{1,6})?$/, "Enter a quantity such as 0, 4 or 2.5"),
          })
          .strict()
      )
      .min(1, "Add at least one line")
      .max(MAX_PURCHASE_ORDER_LINES),
  })
  .strict()
  .superRefine((value, ctx) => {
    const received = value.lines.filter((line) => Number(line.quantity) > 0);
    if (received.length === 0) {
      ctx.addIssue({ code: "custom", path: ["lines"], message: "Enter a quantity for at least one line" });
    }
    const seen = new Set<string>();
    value.lines.forEach((line, index) => {
      if (seen.has(line.purchaseOrderLineId)) {
        ctx.addIssue({ code: "custom", path: ["lines", index, "purchaseOrderLineId"], message: "Duplicate line" });
      }
      seen.add(line.purchaseOrderLineId);
    });
  });

export type ReceiptInput = z.infer<typeof receiptInputSchema>;

export const purchaseOrderListQuerySchema = z
  .object({
    status: z.enum(["all", "draft", "approved", "partially_received", "received", "cancelled"]).default("all"),
    q: optionalText(80).default(""),
    page: pageSchema,
  })
  .strict();

export type PurchaseOrderListQuery = z.infer<typeof purchaseOrderListQuerySchema>;
