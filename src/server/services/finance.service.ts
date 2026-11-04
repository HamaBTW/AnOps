import "server-only";
import clientPromise from "@/server/db/client";
import { ObjectId } from "mongodb";
import { AppError } from "@/shared/lib/errors";
import { assertPermission, permissionsForRole, workspaceRoleFor } from "@/server/security/permissions";
import type { CompanyRole } from "@/features/company/types";
import { addAmounts, computeLineTotal, computeTotals, fromCents, toCents } from "@/features/finance/utils/money";

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
    const todayStr = new Date().toISOString().slice(0, 10);

    const [invoiceAgg, expenseAgg, overdueAgg, overdueList, monthlyPayments, monthlyExpenses] = await Promise.all([
      db.collection("finance_invoices").aggregate([
        { $match: { companyId: this.companyId, status: { $ne: "void" } } },
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
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            amount: { $sum: "$total" },
          },
        },
      ]).toArray(),
      db.collection("finance_invoices").aggregate([
        {
          $match: {
            companyId: this.companyId,
            status: { $nin: ["paid", "void", "draft"] },
            dueDate: { $lt: todayStr },
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            totalOverdue: { $sum: "$balance" },
          },
        },
      ]).toArray(),
      db.collection("finance_invoices").aggregate([
        {
          $match: {
            companyId: this.companyId,
            status: { $nin: ["paid", "void", "draft"] },
            dueDate: { $lt: todayStr },
          },
        },
        {
          $lookup: {
            from: "finance_customers",
            localField: "customerId",
            foreignField: "_id",
            as: "customer",
          },
        },
        { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
        { $sort: { dueDate: 1 } },
        { $limit: 5 },
      ]).toArray(),
      db.collection("finance_payments").find({
        companyId: this.companyId,
      }).sort({ paymentDate: -1 }).toArray(),
      db.collection("finance_expenses").find({
        companyId: this.companyId,
        status: { $in: ["approved", "paid"] },
      }).sort({ expenseDate: -1 }).toArray(),
    ]);

    const inv = (invoiceAgg[0] as any) || { totalInvoiced: 0, totalPaid: 0, outstanding: 0 };
    const expensesCount: Record<string, number> = {};
    const expensesAmount: Record<string, number> = {};
    for (const e of expenseAgg) {
      expensesCount[(e as any)._id as string] = (e as any).count || 0;
      expensesAmount[(e as any)._id as string] = (e as any).amount || 0;
    }

    const overdueData = (overdueAgg[0] as any) || { count: 0, totalOverdue: 0 };

    // Format last 6 months timeline
    const now = new Date();
    const monthlySummary: Array<{
      monthKey: string;
      label: string;
      income: number;
      expenses: number;
      net: number;
    }> = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthNum = String(d.getMonth() + 1).padStart(2, "0");
      const monthKey = `${year}-${monthNum}`;
      const label = d.toLocaleString("default", { month: "short", year: "numeric" });

      const incomeInMonth = monthlyPayments
        .filter((p: any) => typeof p.paymentDate === "string" && p.paymentDate.startsWith(monthKey))
        .reduce((acc: number, cur: any) => acc + (Number(cur.amount) || 0), 0);

      const expensesInMonth = monthlyExpenses
        .filter((e: any) => typeof e.expenseDate === "string" && e.expenseDate.startsWith(monthKey))
        .reduce((acc: number, cur: any) => acc + (Number(cur.total) || 0), 0);

      monthlySummary.push({
        monthKey,
        label,
        income: incomeInMonth,
        expenses: expensesInMonth,
        net: incomeInMonth - expensesInMonth,
      });
    }

    const totalExpensesPaid = expensesAmount.paid || 0;
    const netCashFlow = (inv.totalPaid || 0) - totalExpensesPaid;

    return {
      totalInvoiced: inv.totalInvoiced || 0,
      totalPaid: inv.totalPaid || 0,
      outstanding: inv.outstanding || 0,
      overdue: overdueData.totalOverdue || 0,
      overdueCount: overdueData.count || 0,
      topOverdueInvoices: overdueList.map((d: any) => ({
        id: d._id.toString(),
        invoiceNumber: d.invoiceNumber,
        customerName: d.customer?.name || "Direct Customer",
        dueDate: d.dueDate,
        balance: d.balance || 0,
        currency: d.currency || "TND",
      })),
      expensesDraft: expensesCount.draft || 0,
      expensesSubmitted: expensesCount.submitted || 0,
      expensesApproved: expensesCount.approved || 0,
      expensesPaid: expensesCount.paid || 0,
      totalExpensesAmount: Object.values(expensesAmount).reduce((a, b) => a + b, 0),
      totalExpensesPaidAmount: totalExpensesPaid,
      netCashFlow,
      monthlySummary,
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
        lineTotal: computeLineTotal(l.quantity, l.unitPrice, l.taxRate),
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

  async getInvoice(invoiceId: string) {
    this.ensurePermission("finance.read");
    if (!ObjectId.isValid(invoiceId)) throw new AppError("VALIDATION_ERROR", "Invalid invoice ID");
    const db = await getDb();
    const inv = await db.collection("finance_invoices").findOne({
      _id: new ObjectId(invoiceId),
      companyId: this.companyId,
    });
    if (!inv) throw new AppError("NOT_FOUND", "Invoice not found");

    // Fetch Customer
    let customer: any = null;
    if (inv.customerId && ObjectId.isValid(inv.customerId)) {
      const c = await db.collection("finance_customers").findOne({
        _id: new ObjectId(inv.customerId),
        companyId: this.companyId,
      });
      if (c) {
        customer = {
          id: c._id.toString(),
          name: c.name,
          email: c.email,
          phone: c.phone,
          taxId: c.taxId,
          address: c.address,
        };
      }
    }

    // Fetch Company details
    const company = await db.collection("companies").findOne({ _id: this.companyId });

    // Fetch Payments allocated to this invoice
    const allocations = await db
      .collection("finance_payment_allocations")
      .find({ invoiceId: new ObjectId(invoiceId), companyId: this.companyId })
      .toArray();

    return {
      id: inv._id.toString(),
      companyId: inv.companyId.toString(),
      customerId: inv.customerId?.toString(),
      customer,
      company: company
        ? {
            name: company.name,
            address: company.address,
            taxId: company.taxId || company.matriculeFiscale,
            email: company.email,
            phone: company.phone,
          }
        : null,
      invoiceNumber: inv.invoiceNumber,
      status: inv.status,
      currency: inv.currency,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      notes: inv.notes,
      terms: inv.terms,
      subtotal: inv.subtotal || 0,
      taxTotal: inv.taxTotal || 0,
      total: inv.total || 0,
      amountPaid: inv.amountPaid || 0,
      balance: inv.balance || 0,
      lines: (inv.lines || []).map((l: any) => ({
        id: l._id?.toString() || String(Math.random()),
        productId: l.productId?.toString(),
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        taxRate: l.taxRate || 0,
        lineTotal: l.lineTotal,
      })),
      postedAt: inv.postedAt?.toISOString?.(),
      voidedAt: inv.voidedAt?.toISOString?.(),
      voidReason: inv.voidReason,
      createdAt: inv.createdAt?.toISOString?.(),
      allocations: allocations.map((a: any) => ({
        id: a._id.toString(),
        paymentId: a.paymentId.toString(),
        amount: a.amount,
        allocatedAt: a.allocatedAt?.toISOString?.() || new Date().toISOString(),
      })),
    };
  }

  async exportInvoicesCsv() {
    this.ensurePermission("finance.read");
    const invoices = await this.listInvoices();
    const headers = [
      "Invoice Number",
      "Customer",
      "Status",
      "Issue Date",
      "Due Date",
      "Currency",
      "Subtotal",
      "Tax",
      "Total",
      "Amount Paid",
      "Balance",
    ];

    const rows = invoices.map((inv: any) => [
      `"${inv.invoiceNumber}"`,
      `"${(inv.customer?.name || "Direct Customer").replace(/"/g, '""')}"`,
      `"${inv.status}"`,
      `"${inv.issueDate || ""}"`,
      `"${inv.dueDate || ""}"`,
      `"${inv.currency}"`,
      inv.subtotal.toFixed(2),
      inv.taxTotal.toFixed(2),
      inv.total.toFixed(2),
      inv.amountPaid.toFixed(2),
      inv.balance.toFixed(2),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    return csvContent;
  }

  async listExpenseCategories() {
    this.ensurePermission("finance.read");
    const db = await getDb();
    let categories = await db
      .collection("finance_expense_categories")
      .find({ companyId: this.companyId })
      .sort({ name: 1 })
      .toArray();

    // If no categories yet, seed standard defaults
    if (categories.length === 0) {
      const defaults = [
        "Office & Supplies",
        "Software & Cloud",
        "Travel & Transport",
        "Hardware & Equipment",
        "Marketing & Ads",
        "Utilities & Rent",
        "Meals & Entertainment",
        "Legal & Accounting",
        "Other",
      ];
      const now = new Date();
      const docs = defaults.map((name) => ({
        companyId: this.companyId,
        name,
        active: true,
        createdAt: now,
        updatedAt: now,
      }));
      await db.collection("finance_expense_categories").insertMany(docs);
      categories = await db
        .collection("finance_expense_categories")
        .find({ companyId: this.companyId })
        .sort({ name: 1 })
        .toArray();
    }

    return categories.map((c: any) => ({
      id: c._id.toString(),
      companyId: c.companyId.toString(),
      name: c.name,
      active: c.active !== false,
      createdAt: c.createdAt?.toISOString?.() || new Date().toISOString(),
    }));
  }

  async createExpenseCategory(name: string) {
    this.ensurePermission("finance.expense.manage");
    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 2) throw new AppError("VALIDATION_ERROR", "Category name is required");
    const db = await getDb();
    const now = new Date();
    const res = await db.collection("finance_expense_categories").insertOne({
      companyId: this.companyId,
      name: trimmed,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
    return res.insertedId.toString();
  }

  async listExpenses(statusFilter?: string) {
    this.ensurePermission("finance.read");
    const db = await getDb();
    const query: Record<string, any> = { companyId: this.companyId };
    if (statusFilter && statusFilter !== "all") {
      query.status = statusFilter;
    }
    const docs = await db
      .collection("finance_expenses")
      .find(query)
      .sort({ expenseDate: -1 })
      .limit(200)
      .toArray();

    // Collect category IDs
    const categoryIds = docs
      .map((d: any) => d.categoryId)
      .filter((id: any) => id && ObjectId.isValid(id));

    const categoryMap = new Map<string, string>();
    if (categoryIds.length > 0) {
      const cats = await db
        .collection("finance_expense_categories")
        .find({ _id: { $in: categoryIds }, companyId: this.companyId })
        .toArray();
      for (const c of cats) {
        categoryMap.set(c._id.toString(), c.name);
      }
    }

    return docs.map((d: any) => ({
      id: d._id.toString(),
      companyId: d.companyId.toString(),
      categoryId: d.categoryId?.toString(),
      categoryName: d.categoryId ? categoryMap.get(d.categoryId.toString()) : undefined,
      expenseDate: d.expenseDate,
      vendor: d.vendor,
      description: d.description,
      amount: d.amount || 0,
      tax: d.tax || 0,
      total: d.total || 0,
      currency: d.currency || "TND",
      status: d.status,
      receiptDocumentId: d.receiptDocumentId?.toString(),
      notes: d.notes,
      rejectionReason: d.rejectionReason,
      createdAt: d.createdAt?.toISOString?.() || new Date().toISOString(),
    }));
  }

  async exportExpensesCsv() {
    this.ensurePermission("finance.read");
    const expenses = await this.listExpenses();
    const headers = ["Date", "Vendor", "Category", "Description", "Status", "Currency", "Amount", "Tax", "Total"];
    const rows = expenses.map((e: any) => [
      `"${e.expenseDate || ""}"`,
      `"${(e.vendor || "N/A").replace(/"/g, '""')}"`,
      `"${(e.categoryName || "Uncategorized").replace(/"/g, '""')}"`,
      `"${(e.description || "").replace(/"/g, '""')}"`,
      `"${e.status}"`,
      `"${e.currency}"`,
      (e.amount || 0).toFixed(2),
      (e.tax || 0).toFixed(2),
      (e.total || 0).toFixed(2),
    ]);
    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  }

  async createExpense(input: any, userId: string) {
    this.ensurePermission("finance.expense.manage");
    const db = await getDb();
    const now = new Date();
    const amount = Number(input.amount) || 0;
    const tax = Number(input.tax) || 0;
    const total = addAmounts(amount, tax);

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

    // Money is compared in whole cents: summing floats leaves residue (0.3 - 0.1 is not 0.2) that
    // would reject a legitimate allocation or leave a fraction of a cent on a balance.
    let totalAllocCents = 0;
    for (const a of allocations) {
      if (!ObjectId.isValid(a.invoiceId)) throw new AppError("VALIDATION_ERROR", "Invalid invoice");
      totalAllocCents += toCents(Number(a.amount) || 0);
    }

    if (totalAllocCents <= 0) throw new AppError("VALIDATION_ERROR", "Allocation amount must be positive");
    if (totalAllocCents > toCents(payment.unallocatedAmount || 0)) throw new AppError("VALIDATION_ERROR", "Allocation exceeds unallocated amount");

    // Check invoices exist and balances
    for (const a of allocations) {
      const inv = await db.collection("finance_invoices").findOne({ _id: new ObjectId(a.invoiceId), companyId: this.companyId });
      if (!inv) throw new AppError("NOT_FOUND", "Invoice not found");
      if (toCents(inv.balance || 0) < toCents(Number(a.amount) || 0)) throw new AppError("VALIDATION_ERROR", "Allocation exceeds invoice balance");
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
      { $set: { unallocatedAmount: fromCents(toCents(payment.unallocatedAmount || 0) - totalAllocCents), updatedAt: now } }
    );

    // Update each invoice
    for (const a of allocations) {
      const inv = await db.collection("finance_invoices").findOne({ _id: new ObjectId(a.invoiceId), companyId: this.companyId });
      if (!inv) continue;
      const newPaidCents = toCents(inv.amountPaid || 0) + toCents(Number(a.amount));
      const newBalanceCents = toCents(inv.total || 0) - newPaidCents;
      const newPaid = fromCents(newPaidCents);
      const newBalance = fromCents(newBalanceCents);
      let newStatus = inv.status;
      if (newBalanceCents <= 0) newStatus = "paid";
      else if (newPaidCents > 0) newStatus = "partially_paid";
      await db.collection("finance_invoices").updateOne(
        { _id: new ObjectId(a.invoiceId), companyId: this.companyId },
        { $set: { amountPaid: newPaid, balance: newBalance, status: newStatus, updatedAt: now, updatedBy: userId } }
      );
    }

    return { success: true };
  }

  async listUnpaidInvoices() {
    this.ensurePermission("finance.read");
    const db = await getDb();
    const docs = await db
      .collection("finance_invoices")
      .find({
        companyId: this.companyId,
        status: { $in: ["posted", "partially_paid"] },
        balance: { $gt: 0 },
      })
      .sort({ dueDate: 1, createdAt: 1 })
      .toArray();

    const customerIds = docs.map((d: any) => d.customerId).filter((id: any) => id && ObjectId.isValid(id));
    const customerMap = new Map<string, string>();
    if (customerIds.length > 0) {
      const customers = await db.collection("finance_customers").find({ _id: { $in: customerIds } }).toArray();
      for (const c of customers) customerMap.set(c._id.toString(), c.name);
    }

    return docs.map((d: any) => ({
      id: d._id.toString(),
      invoiceNumber: d.invoiceNumber,
      customerId: d.customerId?.toString(),
      customerName: d.customerId ? customerMap.get(d.customerId.toString()) : "Direct Customer",
      total: d.total || 0,
      amountPaid: d.amountPaid || 0,
      balance: d.balance || 0,
      currency: d.currency || "TND",
      dueDate: d.dueDate,
    }));
  }

  async exportPaymentsCsv() {
    this.ensurePermission("finance.read");
    const payments = await this.listPayments();
    const headers = ["Payment Date", "Method", "Reference", "Currency", "Amount", "Unallocated Amount"];
    const rows = payments.map((p: any) => [
      `"${p.paymentDate || ""}"`,
      `"${p.method || ""}"`,
      `"${(p.reference || "").replace(/"/g, '""')}"`,
      `"${p.currency}"`,
      (p.amount || 0).toFixed(2),
      (p.unallocatedAmount || 0).toFixed(2),
    ]);
    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  }

  async listReceiptExtractions() {
    this.ensurePermission("finance.read");
    const db = await getDb();
    const docs = await db.collection("finance_receipt_extractions").aggregate([
      { $match: { companyId: this.companyId } },
      {
        $lookup: {
          from: "finance_receipt_documents",
          localField: "receiptDocumentId",
          foreignField: "_id",
          as: "doc",
        },
      },
      { $unwind: { path: "$doc", preserveNullAndEmptyArrays: true } },
      { $sort: { createdAt: -1 } },
      { $limit: 50 },
    ]).toArray();

    return docs.map((d: any) => ({
      id: d._id.toString(),
      receiptDocumentId: d.receiptDocumentId?.toString() || "",
      originalName: d.doc?.originalName || "Receipt File",
      mimeType: d.doc?.mimeType || "application/octet-stream",
      size: d.doc?.size || 0,
      proposed: d.proposed || {},
      rawText: d.rawText || "",
      reviewed: !!d.reviewed,
      createdAt: d.createdAt?.toISOString?.() || new Date().toISOString(),
    }));
  }

  async deleteReceiptExtraction(id: string) {
    this.ensurePermission("finance.receipt.ocr");
    if (!ObjectId.isValid(id)) throw new AppError("VALIDATION_ERROR", "Invalid extraction ID");
    const db = await getDb();
    const ext = await db.collection("finance_receipt_extractions").findOne({
      _id: new ObjectId(id),
      companyId: this.companyId,
    });
    if (!ext) throw new AppError("NOT_FOUND", "Extraction not found");

    if (ext.receiptDocumentId) {
      await db.collection("finance_receipt_documents").deleteOne({
        _id: ext.receiptDocumentId,
        companyId: this.companyId,
      });
    }

    await db.collection("finance_receipt_extractions").deleteOne({
      _id: new ObjectId(id),
      companyId: this.companyId,
    });

    return { success: true };
  }

  async markReceiptReviewed(id: string) {
    this.ensurePermission("finance.receipt.ocr");
    if (!ObjectId.isValid(id)) throw new AppError("VALIDATION_ERROR", "Invalid extraction ID");
    const db = await getDb();
    await db.collection("finance_receipt_extractions").updateOne(
      { _id: new ObjectId(id), companyId: this.companyId },
      { $set: { reviewed: true, updatedAt: new Date() } }
    );
    return { success: true };
  }
}

export async function getFinanceService() {
  // Loaded on demand: only the request-cookie entry point needs the session machinery, so the AI tools can use the class without it.
  const { getActiveTenant } = await import("@/server/tenant/context");
  const tenant = await getActiveTenant();
  if (!tenant) throw new AppError("UNAUTHENTICATED", "No active company");
  return new FinanceService({
    companyId: tenant.companyId,
    companyRole: tenant.role,
    userId: (tenant as any).userId || "",
  });
}
