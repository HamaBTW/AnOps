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
