"use server";

import { revalidatePath } from "next/cache";
import { getFinanceService } from "@/server/services/finance.service";
import { getCurrentAuthUser } from "@/server/auth/rbac";
import { customerCreateSchema, customerUpdateSchema, invoiceCreateDraftSchema, invoiceVoidSchema, paymentRecordSchema, paymentAllocateSchema, expenseCreateSchema, expenseRejectSchema } from "@/features/finance/schemas/finance.schema";

export type ActionResult<T = unknown> = { success?: boolean; error?: string; data?: T };

export async function createCustomerAction(input: FormData | Record<string, any>): Promise<ActionResult<{ id: string }>> {
  try {
    const auth = await getCurrentAuthUser();
    if (!auth) return { error: "Unauthorized" };

    const raw = input instanceof FormData ? {
      name: input.get("name"),
      email: input.get("email") || "",
      phone: input.get("phone") || "",
      taxId: input.get("taxId") || "",
      address: input.get("address") || "",
      notes: input.get("notes") || "",
      status: input.get("status") || "active",
    } : input;

    const parsed = customerCreateSchema.safeParse(raw);
    if (!parsed.success) {
      console.warn("[createCustomerAction] Validation failed:", parsed.error.issues);
      const msg = parsed.error.issues[0]?.message || "Invalid input";
      return { error: msg };
    }

    const service = await getFinanceService();
    const id = await service.createCustomer(parsed.data, auth.userId);
    console.log("[createCustomerAction] Successfully created customer:", id);
    revalidatePath("/finance/customers");
    revalidatePath("/finance/invoices");
    return { success: true, data: { id } };
  } catch (e) {
    console.error("[createCustomerAction] Error:", e);
    const msg = e instanceof Error ? e.message : "Failed to create customer";
    return { error: msg };
  }
}

export async function updateCustomerAction(id: string, input: FormData | Record<string, any>): Promise<ActionResult<{ id: string }>> {
  try {
    const auth = await getCurrentAuthUser();
    if (!auth) return { error: "Unauthorized" };

    const raw = input instanceof FormData ? {
      name: input.get("name") || undefined,
      email: input.get("email") || "",
      phone: input.get("phone") || "",
      taxId: input.get("taxId") || "",
      address: input.get("address") || "",
      notes: input.get("notes") || "",
      status: input.get("status") || undefined,
    } : input;

    const parsed = customerUpdateSchema.safeParse(raw);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || "Invalid input";
      return { error: msg };
    }

    const service = await getFinanceService();
    await service.updateCustomer(id, parsed.data, auth.userId);
    revalidatePath("/finance/customers");
    revalidatePath("/finance/invoices");
    return { success: true, data: { id } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update customer";
    return { error: msg };
  }
}

export async function deleteCustomerAction(id: string): Promise<ActionResult<{ deactivated?: boolean; message?: string }>> {
  try {
    const auth = await getCurrentAuthUser();
    if (!auth) return { error: "Unauthorized" };

    const service = await getFinanceService();
    const result = await service.deleteCustomer(id, auth.userId);
    revalidatePath("/finance/customers");
    revalidatePath("/finance/invoices");
    return { success: true, data: result };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to delete customer";
    return { error: msg };
  }
}

export async function createInvoiceDraftAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const auth = await getCurrentAuthUser();
    if (!auth) return { error: "Unauthorized" };

    const linesRaw = formData.get("lines");
    let lines: any[] = [];
    if (typeof linesRaw === "string") {
      try { lines = JSON.parse(linesRaw); } catch { lines = []; }
    }

    const raw = {
      customerId: formData.get("customerId"),
      currency: formData.get("currency") || "TND",
      issueDate: formData.get("issueDate"),
      dueDate: formData.get("dueDate") || "",
      notes: formData.get("notes") || "",
      terms: formData.get("terms") || "",
      lines,
    };

    const parsed = invoiceCreateDraftSchema.safeParse(raw);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || "Invalid input";
      return { error: msg };
    }

    const service = await getFinanceService();
    const id = await service.createInvoiceDraft(parsed.data as any, auth.userId);
    revalidatePath("/finance/invoices");
    return { success: true, data: { id } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create invoice";
    return { error: msg };
  }
}

export async function postInvoiceAction(invoiceId: string): Promise<ActionResult> {
  try {
    const auth = await getCurrentAuthUser();
    if (!auth) return { error: "Unauthorized" };
    const service = await getFinanceService();
    await service.postInvoice(invoiceId, auth.userId);
    revalidatePath("/finance/invoices");
    revalidatePath("/finance");
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to post invoice";
    return { error: msg };
  }
}

export async function voidInvoiceAction(formData: FormData): Promise<ActionResult> {
  try {
    const auth = await getCurrentAuthUser();
    if (!auth) return { error: "Unauthorized" };
    const parsed = invoiceVoidSchema.safeParse({ invoiceId: formData.get("invoiceId"), reason: formData.get("reason") });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Invalid input" };
    const service = await getFinanceService();
    await service.voidInvoice(parsed.data.invoiceId, parsed.data.reason, auth.userId);
    revalidatePath("/finance/invoices");
    revalidatePath("/finance");
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to void invoice";
    return { error: msg };
  }
}

export async function recordPaymentAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const auth = await getCurrentAuthUser();
    if (!auth) return { error: "Unauthorized" };
    const raw = {
      paymentDate: formData.get("paymentDate"),
      amount: formData.get("amount"),
      currency: formData.get("currency") || "TND",
      method: formData.get("method") || "bank_transfer",
      reference: formData.get("reference") || "",
      notes: formData.get("notes") || "",
    };
    const parsed = paymentRecordSchema.safeParse(raw);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Invalid input" };
    const service = await getFinanceService();
    const id = await service.recordPayment(parsed.data as any, auth.userId);
    revalidatePath("/finance/payments");
    return { success: true, data: { id } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to record payment";
    return { error: msg };
  }
}

export async function allocatePaymentAction(formData: FormData): Promise<ActionResult> {
  try {
    const auth = await getCurrentAuthUser();
    if (!auth) return { error: "Unauthorized" };
    const allocRaw = formData.get("allocations");
    let allocations: any[] = [];
    if (typeof allocRaw === "string") { try { allocations = JSON.parse(allocRaw); } catch { allocations = []; } }
    const parsed = paymentAllocateSchema.safeParse({ paymentId: formData.get("paymentId"), allocations });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Invalid input" };
    const service = await getFinanceService();
    await service.allocatePayment(parsed.data.paymentId, parsed.data.allocations, auth.userId);
    revalidatePath("/finance/payments");
    revalidatePath("/finance/invoices");
    revalidatePath("/finance");
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to allocate payment";
    return { error: msg };
  }
}

export async function createExpenseAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const auth = await getCurrentAuthUser();
    if (!auth) return { error: "Unauthorized" };
    const raw = {
      expenseDate: formData.get("expenseDate"),
      categoryId: formData.get("categoryId") || "",
      vendor: formData.get("vendor") || "",
      description: formData.get("description"),
      amount: formData.get("amount"),
      tax: formData.get("tax") || 0,
      currency: formData.get("currency") || "TND",
      notes: formData.get("notes") || "",
      receiptDocumentId: formData.get("receiptDocumentId") || "",
    };
    const parsed = expenseCreateSchema.safeParse(raw);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Invalid input" };
    const service = await getFinanceService();
    const id = await service.createExpense(parsed.data as any, auth.userId);
    revalidatePath("/finance/expenses");
    return { success: true, data: { id } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create expense";
    return { error: msg };
  }
}

export async function submitExpenseAction(expenseId: string): Promise<ActionResult> {
  try {
    const auth = await getCurrentAuthUser();
    if (!auth) return { error: "Unauthorized" };
    const service = await getFinanceService();
    await service.submitExpense(expenseId, auth.userId);
    revalidatePath("/finance/expenses");
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to submit expense";
    return { error: msg };
  }
}

export async function approveExpenseAction(expenseId: string): Promise<ActionResult> {
  try {
    const auth = await getCurrentAuthUser();
    if (!auth) return { error: "Unauthorized" };
    const service = await getFinanceService();
    await service.approveExpense(expenseId, auth.userId);
    revalidatePath("/finance/expenses");
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to approve expense";
    return { error: msg };
  }
}

export async function rejectExpenseAction(formData: FormData): Promise<ActionResult> {
  try {
    const auth = await getCurrentAuthUser();
    if (!auth) return { error: "Unauthorized" };
    const parsed = expenseRejectSchema.safeParse({ expenseId: formData.get("expenseId"), reason: formData.get("reason") });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Invalid input" };
    const service = await getFinanceService();
    await service.rejectExpense(parsed.data.expenseId, parsed.data.reason, auth.userId);
    revalidatePath("/finance/expenses");
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to reject expense";
    return { error: msg };
  }
}

export async function markExpensePaidAction(expenseId: string): Promise<ActionResult> {
  try {
    const auth = await getCurrentAuthUser();
    if (!auth) return { error: "Unauthorized" };
    const service = await getFinanceService();
    await service.markExpensePaid(expenseId, auth.userId);
    revalidatePath("/finance/expenses");
    revalidatePath("/finance");
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to mark expense paid";
    return { error: msg };
  }
}
