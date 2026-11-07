import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";
import { createHarness, type TestHarness } from "../helpers/workspace";
import { FinanceService } from "@/server/services/finance.service";

const shared = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("@/server/db/client", () => ({ default: Promise.resolve({ db: () => shared.db }) }));
vi.mock("@/server/tenant/context", () => ({ getActiveTenant: async () => null }));

let h: TestHarness;
let a: FinanceService;
let b: FinanceService;
const userA = new ObjectId().toHexString();
const userB = new ObjectId().toHexString();
let customer: string;

const mk = (svc: FinanceService, cust: string, amount: number, user: string) =>
  svc.createInvoiceDraft({ customerId: cust, currency: "TND", issueDate: "2026-11-01", lines: [{ description: "Work", quantity: 1, unitPrice: amount }] }, user);

beforeAll(async () => {
  h = await createHarness();
  shared.db = h.db;
  a = new FinanceService({ companyId: h.ctx().companyId.toHexString(), companyRole: "owner", userId: userA });
  b = new FinanceService({ companyId: h.otherTenant().companyId.toHexString(), companyRole: "owner", userId: userB });
  customer = await a.createCustomer({ name: "Service Customer" }, userA);
});
afterAll(async () => {
  await h.cleanup();
});

describe("Finance service money arithmetic is exact to the cent", () => {
  it("a payment can be applied in awkward pieces without residue (0.30 = 0.10 + 0.20)", async () => {
    const inv = await mk(a, customer, 0.3, userA);
    await a.postInvoice(inv, userA);
    const pay = await a.recordPayment({ paymentDate: "2026-11-02", amount: 0.3, currency: "TND", method: "cash" }, userA);
    await a.allocatePayment(pay, [{ invoiceId: inv, amount: 0.1 }], userA);
    await a.allocatePayment(pay, [{ invoiceId: inv, amount: 0.2 }], userA);
    const after = await a.getInvoice(inv);
    expect(after).toMatchObject({ amountPaid: 0.3, balance: 0, status: "paid" });
    expect((await a.listPayments()).find((p) => p.id === pay)?.unallocatedAmount).toBe(0);
  });

  it("many small allocations leave exact balances", async () => {
    const inv = await mk(a, customer, 100.3, userA);
    await a.postInvoice(inv, userA);
    const pay = await a.recordPayment({ paymentDate: "2026-11-02", amount: 100.3, currency: "TND", method: "cash" }, userA);
    for (const amount of [10.1, 20.2, 30.3, 39.7]) await a.allocatePayment(pay, [{ invoiceId: inv, amount }], userA);
    expect(await a.getInvoice(inv)).toMatchObject({ amountPaid: 100.3, balance: 0, status: "paid" });
  });

  it("an expense total is amount plus tax in cents, and invoice line totals are rounded like the invoice totals", async () => {
    const e = await a.createExpense({ expenseDate: "2026-11-02", description: "Float probe", amount: 0.1, tax: 0.2, currency: "TND" }, userA);
    expect((await a.listExpenses("all")).find((x) => x.id === e)?.total).toBe(0.3);
    const inv = await a.createInvoiceDraft({ customerId: customer, currency: "TND", issueDate: "2026-11-01", lines: [{ description: "W", quantity: 3, unitPrice: 19.99, taxRate: 19 }] }, userA);
    const got = await a.getInvoice(inv);
    expect(got.lines[0].lineTotal).toBe(71.36);
    expect(got.total).toBe(71.36);
  });
});

describe("Finance service tenancy", () => {
  it("another company's invoice, payment and customer are not found, and cannot be allocated across companies", async () => {
    const theirCustomer = await b.createCustomer({ name: "Their Customer" }, userB);
    const theirInvoice = await mk(b, theirCustomer, 10, userB);
    await b.postInvoice(theirInvoice, userB);
    const mine = await a.recordPayment({ paymentDate: "2026-11-02", amount: 10, currency: "TND", method: "cash" }, userA);
    await expect(a.getInvoice(theirInvoice)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(a.getCustomer(theirCustomer)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(a.allocatePayment(mine, [{ invoiceId: theirInvoice, amount: 10 }], userA)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await a.listInvoices()).some((i) => i.id === theirInvoice)).toBe(false);
  });
});

const as = (role: "owner" | "admin" | "manager", user: string) => new FinanceService({ companyId: h.ctx().companyId.toHexString(), companyRole: role, userId: user });
const post = async (amount: number, currency = "TND", due = "2027-06-01") => {
  const id = await a.createInvoiceDraft({ customerId: customer, currency, issueDate: "2026-11-01", dueDate: due, lines: [{ description: "W", quantity: 1, unitPrice: amount }] }, userA);
  await a.postInvoice(id, userA);
  return id;
};
const pay = (amount: number, currency = "TND") => a.recordPayment({ paymentDate: "2026-11-02", amount, currency, method: "cash" }, userA);
const code = async (p: Promise<unknown>) => ((await p.then(() => ({ code: "OK" }), (e) => e)) as { code: string }).code;

describe("allocatePayment enforces its own rules, for every caller", () => {
  it("accepts posted and partially paid invoices in the payment's currency", async () => {
    const inv = await post(50);
    const p = await pay(50);
    await a.allocatePayment(p, [{ invoiceId: inv, amount: 20 }], userA);
    expect((await a.getInvoice(inv)).status).toBe("partially_paid");
    await a.allocatePayment(p, [{ invoiceId: inv, amount: 30 }], userA);
    expect((await a.getInvoice(inv)).status).toBe("paid");
  });

  it("rejects draft, voided, paid and cancelled-state invoices without changing anything", async () => {
    const draft = await a.createInvoiceDraft({ customerId: customer, currency: "TND", issueDate: "2026-11-01", lines: [{ description: "D", quantity: 1, unitPrice: 10 }] }, userA);
    const voided = await a.createInvoiceDraft({ customerId: customer, currency: "TND", issueDate: "2026-11-01", lines: [{ description: "V", quantity: 1, unitPrice: 10 }] }, userA);
    await a.voidInvoice(voided, "mistake", userA);
    const paid = await post(10);
    const p = await pay(100);
    await a.allocatePayment(p, [{ invoiceId: paid, amount: 10 }], userA);
    for (const invoiceId of [draft, voided, paid]) expect(await code(a.allocatePayment(p, [{ invoiceId, amount: 5 }], userA))).toMatch(/INVALID_TRANSITION|VALIDATION_ERROR/);
    expect(await code(a.allocatePayment(p, [{ invoiceId: draft, amount: 5 }], userA))).toBe("INVALID_TRANSITION");
    expect((await a.listPayments()).find((x) => x.id === p)?.unallocatedAmount).toBe(90);
    expect((await a.getInvoice(draft)).amountPaid).toBe(0);
  });

  it("rejects a currency mismatch, and a rejected multi-invoice request applies nothing at all", async () => {
    const eur = await post(40, "EUR");
    const tnd = await post(40);
    const p = await pay(100);
    expect(await code(a.allocatePayment(p, [{ invoiceId: eur, amount: 10 }], userA))).toBe("VALIDATION_ERROR");
    expect(await code(a.allocatePayment(p, [{ invoiceId: tnd, amount: 10 }, { invoiceId: eur, amount: 10 }], userA))).toBe("VALIDATION_ERROR");
    expect(await code(a.allocatePayment(p, [{ invoiceId: tnd, amount: 10 }, { invoiceId: tnd, amount: 10 }], userA))).toBe("VALIDATION_ERROR");
    expect((await a.getInvoice(tnd)).amountPaid).toBe(0);
    expect((await a.listPayments()).find((x) => x.id === p)?.unallocatedAmount).toBe(100);
  });
});

describe("dashboard definitions", () => {
  it("counts only posted, partially paid and paid invoices: drafts and voided ones never inflate invoiced or outstanding", async () => {
    const c = await a.createCustomer({ name: "Dashboard Customer" }, userA);
    const before = await a.getDashboard();
    const mk = (amount: number, due: string) => a.createInvoiceDraft({ customerId: c, currency: "TND", issueDate: "2026-01-01", dueDate: due, lines: [{ description: "X", quantity: 1, unitPrice: amount }] }, userA);
    await mk(1000, "2026-01-31"); // stays draft
    const voided = await mk(2000, "2026-01-31");
    await a.postInvoice(voided, userA);
    await a.voidInvoice(voided, "mistake", userA);
    const open = await mk(300, "2026-01-31");
    await a.postInvoice(open, userA);
    const partial = await mk(200, "2099-01-01");
    await a.postInvoice(partial, userA);
    await a.allocatePayment(await pay(50), [{ invoiceId: partial, amount: 50 }], userA);
    const after = await a.getDashboard();
    expect(after.totalInvoiced - before.totalInvoiced).toBe(500); // 300 + 200
    expect(after.totalPaid - before.totalPaid).toBe(50);
    expect(after.outstanding - before.outstanding).toBe(450);
    expect(after.overdue - before.overdue).toBe(300); // only the open past-due one
    expect(after.overdueCount - before.overdueCount).toBe(1);
  });

  it("a fully paid invoice is not overdue and a draft past its due date is not overdue", async () => {
    const before = await a.getDashboard();
    const paid = await post(70, "TND", "2026-01-05");
    await a.allocatePayment(await pay(70), [{ invoiceId: paid, amount: 70 }], userA);
    await a.createInvoiceDraft({ customerId: customer, currency: "TND", issueDate: "2026-01-01", dueDate: "2026-01-05", lines: [{ description: "D", quantity: 1, unitPrice: 9 }] }, userA);
    const after = await a.getDashboard();
    expect(after.overdueCount).toBe(before.overdueCount);
    expect(after.overdue).toBe(before.overdue);
  });

  it("totals carry no floating-point residue", async () => {
    const d = await a.getDashboard();
    for (const n of [d.totalInvoiced, d.totalPaid, d.outstanding, d.overdue]) expect(Math.round(n * 100) / 100).toBe(n);
  });
});

describe("expense approval separation of duties", () => {
  const admin1 = new ObjectId().toHexString();
  const admin2 = new ObjectId().toHexString();
  const clerk = new ObjectId().toHexString();
  const submitted = async (creator: string, submitter = creator) => {
    const id = await as("admin", creator).createExpense({ expenseDate: "2026-11-02", description: "SoD probe", amount: 10, tax: 0, currency: "TND" }, creator);
    await as("admin", submitter).submitExpense(id, submitter);
    return id;
  };

  it("a non-owner cannot approve an expense they created or submitted; another approver can", async () => {
    const own = await submitted(admin1);
    expect(await code(as("admin", admin1).approveExpense(own, admin1))).toBe("FORBIDDEN");
    expect((await a.listExpenses("submitted")).some((e) => e.id === own)).toBe(true); // still waiting
    await as("admin", admin2).approveExpense(own, admin2);
    expect((await a.listExpenses("approved")).some((e) => e.id === own)).toBe(true);
    const drafted = await as("manager", clerk).createExpense({ expenseDate: "2026-11-02", description: "Clerk draft", amount: 5, tax: 0, currency: "TND" }, clerk);
    await as("admin", admin1).submitExpense(drafted, admin1);
    expect(await code(as("admin", clerk).approveExpense(drafted, clerk))).toBe("FORBIDDEN"); // the creator, even though someone else submitted
  });

  it("the owner may approve their own, so a single-owner company is never locked out; rejection is not restricted", async () => {
    const mine = await submitted(userA);
    expect(await code(a.approveExpense(mine, userA))).toBe("OK");
    const theirs = await submitted(admin1);
    expect(await code(as("admin", admin1).rejectExpense(theirs, "withdrawn by me", admin1))).toBe("OK");
  });

  it("a manager cannot approve at all, as before", async () => {
    const id = await submitted(admin1);
    expect(await code(as("manager", clerk).approveExpense(id, clerk))).toBe("FORBIDDEN");
  });
});
