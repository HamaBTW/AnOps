import { z } from "zod";

export const currencySchema = z.enum(["TND", "USD", "EUR", "GBP"]);
export const paymentMethodSchema = z.enum(["cash", "bank_transfer", "card", "cheque", "other"]);
export const customerStatusSchema = z.enum(["active", "inactive"]);

export const customerCreateSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  taxId: z.string().trim().optional().or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
  status: customerStatusSchema.default("active"),
});

export const customerUpdateSchema = customerCreateSchema.partial();

export const invoiceLineInputSchema = z.object({
  description: z.string().trim().min(1, "Description is required"),
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
  unitPrice: z.coerce.number().min(0, "Unit price must be >= 0"),
  taxRate: z.coerce.number().min(0).max(100).optional(),
});

export const invoiceCreateDraftSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  currency: currencySchema.default("TND"),
  issueDate: z.string().min(1, "Issue date is required"),
  dueDate: z.string().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
  terms: z.string().trim().optional().or(z.literal("")),
  lines: z.array(invoiceLineInputSchema).min(1, "Add at least one line"),
});

export const invoiceUpdateDraftSchema = invoiceCreateDraftSchema.partial();

export const invoiceVoidSchema = z.object({
  invoiceId: z.string().min(1),
  reason: z.string().trim().min(3, "Reason is required"),
});

export const paymentRecordSchema = z.object({
  paymentDate: z.string().min(1, "Payment date is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  currency: currencySchema.default("TND"),
  method: paymentMethodSchema.default("bank_transfer"),
  reference: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
});

export const paymentAllocateSchema = z.object({
  paymentId: z.string().min(1),
  allocations: z
    .array(
      z.object({
        invoiceId: z.string().min(1),
        amount: z.coerce.number().positive("Allocation amount must be positive"),
      })
    )
    .min(1, "Add at least one allocation"),
});

export const expenseCategorySchema = z.object({
  name: z.string().trim().min(2, "Category name is required"),
  active: z.boolean().default(true),
});

export const expenseCreateSchema = z.object({
  expenseDate: z.string().min(1, "Expense date is required"),
  categoryId: z.string().optional().or(z.literal("")),
  vendor: z.string().trim().optional().or(z.literal("")),
  description: z.string().trim().min(3, "Description is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  tax: z.coerce.number().min(0).optional(),
  currency: currencySchema.default("TND"),
  notes: z.string().trim().optional().or(z.literal("")),
  receiptDocumentId: z.string().optional().or(z.literal("")),
});

export const expenseRejectSchema = z.object({
  expenseId: z.string().min(1),
  reason: z.string().trim().min(3, "Rejection reason is required"),
});

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;
export type InvoiceLineInput = z.infer<typeof invoiceLineInputSchema>;
export type InvoiceCreateDraftInput = z.infer<typeof invoiceCreateDraftSchema>;
export type InvoiceUpdateDraftInput = z.infer<typeof invoiceUpdateDraftSchema>;
export type InvoiceVoidInput = z.infer<typeof invoiceVoidSchema>;
export type PaymentRecordInput = z.infer<typeof paymentRecordSchema>;
export type PaymentAllocateInput = z.infer<typeof paymentAllocateSchema>;
export type ExpenseCategoryInput = z.infer<typeof expenseCategorySchema>;
export type ExpenseCreateInput = z.infer<typeof expenseCreateSchema>;
export type ExpenseRejectInput = z.infer<typeof expenseRejectSchema>;
