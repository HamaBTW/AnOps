import "server-only";
import clientPromise from "@/server/db/client";
import { ObjectId } from "mongodb";
import { AppError } from "@/shared/lib/errors";
import { assertPermission, permissionsForRole, workspaceRoleFor } from "@/server/security/permissions";
import { getActiveTenant } from "@/server/tenant/context";
import type { CompanyRole } from "@/features/company/types";
import { computeTotals } from "@/features/finance/utils/money";

export type FinanceServiceContext = {
  companyId: string;
  companyRole: CompanyRole;
  userId: string;
};

async function getDb() {
  const client = await clientPromise;
  return client.db();
}

function requireCompanyId(companyId: string) {
  if (!companyId || !ObjectId.isValid(companyId)) {
    throw new AppError("VALIDATION_ERROR", "Invalid companyId");
  }
  return new ObjectId(companyId);
}

async function getNextInvoiceNumber(db: any, companyId: ObjectId) {
  const year = new Date().getFullYear();
  const counter = db.collection("finance_counters");
  const res = await counter.findOneAndUpdate(
    { companyId, key: `invoice_${year}` },
    { $inc: { seq: 1 }, $setOnInsert: { companyId, key: `invoice_${year}`, createdAt: new Date() } },
    { upsert: true, returnDocument: "after" }
  );
  const seq = (res?.seq as number) || 1;
  return `INV-${year}-${String(seq).padStart(5, "0")}`;
}

export class FinanceService {
  private companyId: ObjectId;
  private permissions: ReadonlySet<import("@/server/security/permissions").Permission>;

  constructor(ctx: FinanceServiceContext) {
    this.companyId = requireCompanyId(ctx.companyId);
    const workspaceRole = workspaceRoleFor(ctx.companyRole);
    this.permissions = permissionsForRole(workspaceRole);
  }

  hasPermission(permission: import("@/server/security/permissions").Permission): boolean {
    return this.permissions.has(permission);
  }

  private ensurePermission(permission: import("@/server/security/permissions").Permission) {
    assertPermission(this.permissions, permission);
  }

  async getDashboard() {
    this.ensurePermission("finance.read");
    const db = await getDb();

    const [invoiceAgg, expenseAgg] = await Promise.all([
      db.collection("finance_invoices").aggregate([
        { $match: { companyId: this.companyId } },
        {
          $group: {
            _id: null,
            totalInvoiced: { $sum: "$total" },
            totalPaid: { $sum: "$amountPaid" },
            outstanding: { $sum: "$balance" },
          },
        },
      ]).toArray(),
      db.collection("finance_expenses").aggregate([
        { $match: { companyId: this.companyId } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]).toArray(),
    ]);

    const inv = (invoiceAgg[0] as any) || { totalInvoiced: 0, totalPaid: 0, outstanding: 0 };
    const expenses: Record<string, number> = {};
    for (const e of expenseAgg) {
      expenses[(e as any)._id as string] = (e as any).count as number;
    }

    return {
      totalInvoiced: inv.totalInvoiced || 0,
      totalPaid: inv.totalPaid || 0,
      outstanding: inv.outstanding || 0,
      overdue: 0,
      expensesDraft: expenses.draft || 0,
      expensesSubmitted: expenses.submitted || 0,
      expensesApproved: expenses.approved || 0,
      expensesPaid: expenses.paid || 0,
      currency: "TND",
    };
  }

  async listCustomers() {
    this.ensurePermission("finance.read");
    const db = await getDb();
    const docs = await db
      .collection("finance_customers")
      .find({ companyId: this.companyId })
      .sort({ name: 1 })
      .toArray();

    return docs.map((d: any) => ({
      id: d._id.toString(),
      companyId: d.companyId.toString(),
      name: d.name,
      email: d.email,
      phone: d.phone,
      taxId: d.taxId,
      address: d.address,
      notes: d.notes,
      status: d.status,
      createdAt: d.createdAt?.toISOString?.() || new Date().toISOString(),
      updatedAt: d.updatedAt?.toISOString?.() || new Date().toISOString(),
    }));
  }

  async getCustomer(customerId: string) {
    this.ensurePermission("finance.read");
    if (!ObjectId.isValid(customerId)) throw new AppError("VALIDATION_ERROR", "Invalid customer ID");
    const db = await getDb();
    const d = await db.collection("finance_customers").findOne({
      _id: new ObjectId(customerId),
      companyId: this.companyId,
    });
    if (!d) throw new AppError("NOT_FOUND", "Customer not found");

    return {
      id: d._id.toString(),
      companyId: d.companyId.toString(),
      name: d.name,
      email: d.email,
      phone: d.phone,
      taxId: d.taxId,
      address: d.address,
      notes: d.notes,
      status: d.status,
      createdAt: d.createdAt?.toISOString?.() || new Date().toISOString(),
      updatedAt: d.updatedAt?.toISOString?.() || new Date().toISOString(),
    };
  }

  async createCustomer(input: { name: string; email?: string; phone?: string; taxId?: string; address?: string; notes?: string; status?: "active" | "inactive" }, userId: string) {
    this.ensurePermission("finance.customer.manage");
    const db = await getDb();
    const now = new Date();

    const doc = {
      companyId: this.companyId,
      name: input.name.trim(),
      email: input.email?.trim() || undefined,
      phone: input.phone?.trim() || undefined,
      taxId: input.taxId?.trim() || undefined,
      address: input.address?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      status: input.status || "active",
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    };

    const result = await db.collection("finance_customers").insertOne(doc);
    return result.insertedId.toString();
  }

  async updateCustomer(
    customerId: string,
    input: {
      name?: string;
      email?: string;
      phone?: string;
      taxId?: string;
      address?: string;
      notes?: string;
      status?: "active" | "inactive";
    },
    userId: string
  ) {
    this.ensurePermission("finance.customer.manage");
    if (!ObjectId.isValid(customerId)) throw new AppError("VALIDATION_ERROR", "Invalid customer ID");
    const db = await getDb();
    const now = new Date();

    const updateFields: Record<string, any> = {
      updatedAt: now,
      updatedBy: userId,
    };
    if (input.name !== undefined) updateFields.name = input.name.trim();
    if (input.email !== undefined) updateFields.email = input.email?.trim() || undefined;
    if (input.phone !== undefined) updateFields.phone = input.phone?.trim() || undefined;
    if (input.taxId !== undefined) updateFields.taxId = input.taxId?.trim() || undefined;
    if (input.address !== undefined) updateFields.address = input.address?.trim() || undefined;
    if (input.notes !== undefined) updateFields.notes = input.notes?.trim() || undefined;
    if (input.status !== undefined) updateFields.status = input.status;

    const res = await db.collection("finance_customers").updateOne(
      { _id: new ObjectId(customerId), companyId: this.companyId },
      { $set: updateFields }
    );

    if (res.matchedCount === 0) throw new AppError("NOT_FOUND", "Customer not found");
    return { success: true };
  }

  async deleteCustomer(customerId: string, userId: string) {
    this.ensurePermission("finance.customer.manage");
    if (!ObjectId.isValid(customerId)) throw new AppError("VALIDATION_ERROR", "Invalid customer ID");
    const db = await getDb();

    // Check if customer has any invoices
    const invoiceCount = await db.collection("finance_invoices").countDocuments({
      companyId: this.companyId,
      customerId: new ObjectId(customerId),
    });

    if (invoiceCount > 0) {
      // Customer has historical invoices: soft-deactivate to protect financial integrity
      const now = new Date();
      await db.collection("finance_customers").updateOne(
        { _id: new ObjectId(customerId), companyId: this.companyId },
        { $set: { status: "inactive", updatedAt: now, updatedBy: userId } }
      );
      return {
        success: true,
        deactivated: true,
        message: `Customer is linked to ${invoiceCount} invoice(s) and was deactivated to preserve financial records.`,
      };
    }

    const res = await db.collection("finance_customers").deleteOne({
      _id: new ObjectId(customerId),
      companyId: this.companyId,
    });

    if (res.deletedCount === 0) throw new AppError("NOT_FOUND", "Customer not found");
    return { success: true, deactivated: false };
  }

  async listInvoices() {
    this.ensurePermission("finance.read");
    const db = await getDb();
    const docs = await db
      .collection("finance_invoices")
      .find({ companyId: this.companyId })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    // Collect customer IDs for lookup
    const customerIds = docs
      .map((d: any) => d.customerId)
      .filter((id: any) => id && ObjectId.isValid(id));

    const customerMap = new Map<string, { id: string; name: string; email?: string }>();
    if (customerIds.length > 0) {
      const customers = await db
        .collection("finance_customers")
        .find({ _id: { $in: customerIds }, companyId: this.companyId })
        .toArray();
      for (const c of customers) {
        customerMap.set(c._id.toString(), {
          id: c._id.toString(),
          name: c.name,
          email: c.email,
        });
      }
    }

    return docs.map((d: any) => ({
      id: d._id.toString(),
      companyId: d.companyId.toString(),
      customerId: d.customerId?.toString(),
      customer: d.customerId ? customerMap.get(d.customerId.toString()) : undefined,
      invoiceNumber: d.invoiceNumber,
      status: d.status,
      currency: d.currency,
      issueDate: d.issueDate,
      dueDate: d.dueDate,
      subtotal: d.subtotal || 0,
      taxTotal: d.taxTotal || 0,
      total: d.total || 0,
      amountPaid: d.amountPaid || 0,
      balance: d.balance || 0,
      createdAt: d.createdAt?.toISOString?.() || new Date().toISOString(),
    }));
  }

  async listInvoiceableProducts() {
    this.ensurePermission("finance.read");
    const db = await getDb();
    const docs = await db
      .collection("inventory_products")
      .find({ companyId: this.companyId, isActive: true })
      .sort({ name: 1 })
      .limit(200)
      .toArray();

    return docs.map((d: any) => ({
      id: d._id.toString(),
      name: d.name,
      sku: d.sku,
      unitPrice: d.salePriceMilli ? d.salePriceMilli / 1000 : 0,
      description: d.description || d.name,
    }));
  }

  async createInvoiceDraft(input: {
    customerId: string;
    currency?: string;
    issueDate: string;
    dueDate?: string;
    notes?: string;
    terms?: string;
    lines: Array<{ productId?: string; description: string; quantity: number; unitPrice: number; taxRate?: number }>;
  }, userId: string) {
    this.ensurePermission("finance.invoice.manage");
    if (!ObjectId.isValid(input.customerId)) throw new AppError("VALIDATION_ERROR", "Invalid customer");

    const db = await getDb();
    const customer = await db.collection("finance_customers").findOne({ _id: new ObjectId(input.customerId), companyId: this.companyId });
    if (!customer) throw new AppError("NOT_FOUND", "Customer not found");

    const totals = computeTotals(input.lines);
    const now = new Date();
    const invoiceNumber = await getNextInvoiceNumber(db, this.companyId);

    const doc = {
      companyId: this.companyId,
      customerId: new ObjectId(input.customerId),
      invoiceNumber,
      status: "draft",
      currency: input.currency || "TND",
      issueDate: input.issueDate,
      dueDate: input.dueDate || undefined,
      notes: input.notes?.trim() || undefined,
      terms: input.terms?.trim() || undefined,
      subtotal: totals.subtotal,
      taxTotal: totals.taxTotal,
      total: totals.total,
      amountPaid: 0,
      balance: totals.total,
      lines: input.lines.map((l) => ({
        _id: new ObjectId(),
        productId: l.productId && ObjectId.isValid(l.productId) ? new ObjectId(l.productId) : undefined,
        description: l.description.trim(),
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        taxRate: l.taxRate || 0,
        lineTotal: (l.quantity * l.unitPrice) + ((l.quantity * l.unitPrice) * ((l.taxRate || 0) / 100)),
      })),
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    };

    const result = await db.collection("finance_invoices").insertOne(doc);
    return result.insertedId.toString();
  }

  async postInvoice(invoiceId: string, userId: string) {
    this.ensurePermission("finance.invoice.post");
    if (!ObjectId.isValid(invoiceId)) throw new AppError("VALIDATION_ERROR", "Invalid invoice");
    const db = await getDb();
    const now = new Date();

    const res = await db.collection("finance_invoices").updateOne(
      { _id: new ObjectId(invoiceId), companyId: this.companyId, status: "draft" },
      { $set: { status: "posted", postedAt: now, postedBy: userId, updatedAt: now, updatedBy: userId } }
    );

    if (res.matchedCount === 0) throw new AppError("INVALID_TRANSITION", "Invoice cannot be posted");
    return { success: true };
  }

  async voidInvoice(invoiceId: string, reason: string, userId: string) {
    this.ensurePermission("finance.invoice.post");
    if (!ObjectId.isValid(invoiceId)) throw new AppError("VALIDATION_ERROR", "Invalid invoice");
    const db = await getDb();
    const now = new Date();

    const res = await db.collection("finance_invoices").updateOne(
      { _id: new ObjectId(invoiceId), companyId: this.companyId, status: { $in: ["draft", "posted", "partially_paid"] } },
      { $set: { status: "voided", voidedAt: now, voidedBy: userId, voidReason: reason.trim(), updatedAt: now, updatedBy: userId } }
    );

    if (res.matchedCount === 0) throw new AppError("INVALID_TRANSITION", "Invoice cannot be voided");
    return { success: true };
  }

  async listExpenses() {
    this.ensurePermission("finance.read");
    const db = await getDb();
    const docs = await db.collection("finance_expenses").find({ companyId: this.companyId }).sort({ expenseDate: -1 }).limit(100).toArray();
    return docs.map((d: any) => ({
      id: d._id.toString(),
      companyId: d.companyId.toString(),
      expenseDate: d.expenseDate,
      vendor: d.vendor,
      description: d.description,
      amount: d.amount,
      tax: d.tax,
      total: d.total,
      currency: d.currency,
      status: d.status,
      createdAt: d.createdAt?.toISOString?.() || new Date().toISOString(),
    }));
  }

  async createExpense(input: any, userId: string) {
    this.ensurePermission("finance.expense.manage");
    const db = await getDb();
    const now = new Date();
    const amount = Number(input.amount) || 0;
    const tax = Number(input.tax) || 0;
    const total = amount + tax;

    const doc = {
      companyId: this.companyId,
      categoryId: input.categoryId && ObjectId.isValid(input.categoryId) ? new ObjectId(input.categoryId) : undefined,
      expenseDate: input.expenseDate,
      vendor: input.vendor?.trim() || undefined,
      description: input.description.trim(),
      amount,
      tax,
      total,
      currency: input.currency || "TND",
      status: "draft",
      receiptDocumentId: input.receiptDocumentId && ObjectId.isValid(input.receiptDocumentId) ? new ObjectId(input.receiptDocumentId) : undefined,
      notes: input.notes?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    };

    const result = await db.collection("finance_expenses").insertOne(doc);
    return result.insertedId.toString();
  }

  async submitExpense(expenseId: string, userId: string) {
    this.ensurePermission("finance.expense.manage");
    if (!ObjectId.isValid(expenseId)) throw new AppError("VALIDATION_ERROR", "Invalid expense");
    const db = await getDb();
    const now = new Date();
    const res = await db.collection("finance_expenses").updateOne(
      { _id: new ObjectId(expenseId), companyId: this.companyId, status: "draft" },
      { $set: { status: "submitted", submittedAt: now, submittedBy: userId, updatedAt: now, updatedBy: userId } }
    );
    if (res.matchedCount === 0) throw new AppError("INVALID_TRANSITION", "Expense cannot be submitted");
    return { success: true };
  }

  async approveExpense(expenseId: string, userId: string) {
    this.ensurePermission("finance.expense.approve");
    if (!ObjectId.isValid(expenseId)) throw new AppError("VALIDATION_ERROR", "Invalid expense");
    const db = await getDb();
    const now = new Date();
    const res = await db.collection("finance_expenses").updateOne(
      { _id: new ObjectId(expenseId), companyId: this.companyId, status: "submitted" },
      { $set: { status: "approved", approvedAt: now, approvedBy: userId, updatedAt: now, updatedBy: userId } }
    );
    if (res.matchedCount === 0) throw new AppError("INVALID_TRANSITION", "Expense cannot be approved");
    return { success: true };
  }

  async rejectExpense(expenseId: string, reason: string, userId: string) {
    this.ensurePermission("finance.expense.approve");
    if (!ObjectId.isValid(expenseId)) throw new AppError("VALIDATION_ERROR", "Invalid expense");
    const db = await getDb();
    const now = new Date();
    const res = await db.collection("finance_expenses").updateOne(
      { _id: new ObjectId(expenseId), companyId: this.companyId, status: "submitted" },
      { $set: { status: "rejected", rejectedAt: now, rejectedBy: userId, rejectionReason: reason.trim(), updatedAt: now, updatedBy: userId } }
    );
    if (res.matchedCount === 0) throw new AppError("INVALID_TRANSITION", "Expense cannot be rejected");
    return { success: true };
  }

  async markExpensePaid(expenseId: string, userId: string) {
    this.ensurePermission("finance.expense.pay");
    if (!ObjectId.isValid(expenseId)) throw new AppError("VALIDATION_ERROR", "Invalid expense");
    const db = await getDb();
    const now = new Date();
    const res = await db.collection("finance_expenses").updateOne(
      { _id: new ObjectId(expenseId), companyId: this.companyId, status: "approved" },
      { $set: { status: "paid", paidAt: now, paidBy: userId, updatedAt: now, updatedBy: userId } }
    );
    if (res.matchedCount === 0) throw new AppError("INVALID_TRANSITION", "Expense cannot be marked paid");
    return { success: true };
  }

  async listPayments() {
    this.ensurePermission("finance.read");
    const db = await getDb();
    const docs = await db.collection("finance_payments").find({ companyId: this.companyId }).sort({ paymentDate: -1 }).limit(100).toArray();
    return docs.map((d: any) => ({
      id: d._id.toString(),
      companyId: d.companyId.toString(),
      paymentDate: d.paymentDate,
      amount: d.amount || 0,
      currency: d.currency,
      method: d.method,
      reference: d.reference,
      unallocatedAmount: d.unallocatedAmount || 0,
      createdAt: d.createdAt?.toISOString?.() || new Date().toISOString(),
    }));
  }

  async recordPayment(input: { paymentDate: string; amount: number; currency?: string; method?: string; reference?: string; notes?: string }, userId: string) {
    this.ensurePermission("finance.payment.allocate");
    const amount = Number(input.amount) || 0;
    if (amount <= 0) throw new AppError("VALIDATION_ERROR", "Amount must be positive");

    const db = await getDb();
    const now = new Date();
    const doc = {
      companyId: this.companyId,
      paymentDate: input.paymentDate,
      amount,
      currency: input.currency || "TND",
      method: input.method || "bank_transfer",
      reference: input.reference?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      unallocatedAmount: amount,
      receivedBy: userId,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection("finance_payments").insertOne(doc);
    return result.insertedId.toString();
  }

  async allocatePayment(paymentId: string, allocations: Array<{ invoiceId: string; amount: number }>, userId: string) {
    this.ensurePermission("finance.payment.allocate");
    if (!ObjectId.isValid(paymentId)) throw new AppError("VALIDATION_ERROR", "Invalid payment");

    const db = await getDb();
    const now = new Date();
    const payment = await db.collection("finance_payments").findOne({ _id: new ObjectId(paymentId), companyId: this.companyId });
    if (!payment) throw new AppError("NOT_FOUND", "Payment not found");

    let totalAlloc = 0;
    for (const a of allocations) {
      if (!ObjectId.isValid(a.invoiceId)) throw new AppError("VALIDATION_ERROR", "Invalid invoice");
      totalAlloc += Number(a.amount) || 0;
    }

    if (totalAlloc <= 0) throw new AppError("VALIDATION_ERROR", "Allocation amount must be positive");
    if (totalAlloc > (payment.unallocatedAmount || 0)) throw new AppError("VALIDATION_ERROR", "Allocation exceeds unallocated amount");

    // Check invoices exist and balances
    for (const a of allocations) {
      const inv = await db.collection("finance_invoices").findOne({ _id: new ObjectId(a.invoiceId), companyId: this.companyId });
      if (!inv) throw new AppError("NOT_FOUND", "Invoice not found");
      if ((inv.balance || 0) < (Number(a.amount) || 0)) throw new AppError("VALIDATION_ERROR", "Allocation exceeds invoice balance");
    }

    // Insert allocations and update
    const ops: any[] = [];
    for (const a of allocations) {
      ops.push({
        insertOne: {
          document: {
            companyId: this.companyId,
            paymentId: new ObjectId(paymentId),
            invoiceId: new ObjectId(a.invoiceId),
            amount: Number(a.amount),
            allocatedAt: now,
            allocatedBy: userId,
          },
        },
      });
    }
    if (ops.length) await db.collection("finance_payment_allocations").bulkWrite(ops);

    // Update payment
    await db.collection("finance_payments").updateOne(
      { _id: new ObjectId(paymentId), companyId: this.companyId },
      { $set: { unallocatedAmount: (payment.unallocatedAmount || 0) - totalAlloc, updatedAt: now } }
    );

    // Update each invoice
    for (const a of allocations) {
      const inv = await db.collection("finance_invoices").findOne({ _id: new ObjectId(a.invoiceId), companyId: this.companyId });
      if (!inv) continue;
      const newPaid = (inv.amountPaid || 0) + Number(a.amount);
      const newBalance = (inv.total || 0) - newPaid;
      let newStatus = inv.status;
      if (newBalance <= 0) newStatus = "paid";
      else if (newPaid > 0) newStatus = "partially_paid";
      await db.collection("finance_invoices").updateOne(
        { _id: new ObjectId(a.invoiceId), companyId: this.companyId },
        { $set: { amountPaid: newPaid, balance: newBalance, status: newStatus, updatedAt: now, updatedBy: userId } }
      );
    }

    return { success: true };
  }
}

export async function getFinanceService() {
  const tenant = await getActiveTenant();
  if (!tenant) throw new AppError("UNAUTHENTICATED", "No active company");
  return new FinanceService({
    companyId: tenant.companyId,
    companyRole: tenant.role,
    userId: (tenant as any).userId || "",
  });
}
