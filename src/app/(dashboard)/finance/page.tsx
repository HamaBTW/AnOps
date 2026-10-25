import { getFinanceService } from "@/server/services/finance.service";
import Link from "next/link";
import { IconUsers, IconReceipt, IconWallet, IconDocument, IconPackage } from "@/shared/components/ui/brand-icons";

export default async function FinancePage() {
  let kpi = {
    totalInvoiced: 0,
    totalPaid: 0,
    outstanding: 0,
    overdue: 0,
    expensesDraft: 0,
    expensesSubmitted: 0,
    expensesApproved: 0,
    expensesPaid: 0,
    currency: "TND",
  };

  try {
    const service = await getFinanceService();
    kpi = await service.getDashboard();
  } catch {
    // Render empty state if unauthorized/no company
  }

  const fmt = (n: number) => new Intl.NumberFormat("fr-TN", { style: "currency", currency: kpi.currency }).format(n || 0);

  const quickLinks = [
    { name: "Customers", href: "/finance/customers", icon: IconUsers, desc: "Manage customer accounts" },
    { name: "Invoices", href: "/finance/invoices", icon: IconReceipt, desc: "Create and track invoices" },
    { name: "Payments", href: "/finance/payments", icon: IconWallet, desc: "Record and allocate payments" },
    { name: "Expenses", href: "/finance/expenses", icon: IconDocument, desc: "Track and approve expenses" },
    { name: "Receipts (OCR)", href: "/finance/receipts", icon: IconPackage, desc: "Scan receipts with AI" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">Finance & Invoicing</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">Overview of invoices, payments, expenses and balances</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="p-4 bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-[var(--radius-control)]">
          <div className="text-sm text-[var(--color-text-secondary)]">Total Invoiced</div>
          <div className="mt-1 text-xl font-semibold text-[var(--color-text-primary)]">{fmt(kpi.totalInvoiced)}</div>
        </div>
        <div className="p-4 bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-[var(--radius-control)]">
          <div className="text-sm text-[var(--color-text-secondary)]">Total Paid</div>
          <div className="mt-1 text-xl font-semibold text-[var(--color-text-primary)]">{fmt(kpi.totalPaid)}</div>
        </div>
        <div className="p-4 bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-[var(--radius-control)]">
          <div className="text-sm text-[var(--color-text-secondary)]">Outstanding</div>
          <div className="mt-1 text-xl font-semibold text-[var(--color-text-primary)]">{fmt(kpi.outstanding)}</div>
        </div>
        <div className="p-4 bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-[var(--radius-control)]">
          <div className="text-sm text-[var(--color-text-secondary)]">Overdue</div>
          <div className="mt-1 text-xl font-semibold text-[var(--color-text-primary)]">{fmt(kpi.overdue)}</div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="p-4 bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-[var(--radius-control)]">
          <div className="text-sm text-[var(--color-text-secondary)]">Expenses - Draft</div>
          <div className="mt-1 text-lg font-semibold text-[var(--color-text-primary)]">{kpi.expensesDraft}</div>
        </div>
        <div className="p-4 bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-[var(--radius-control)]">
          <div className="text-sm text-[var(--color-text-secondary)]">Expenses - Submitted</div>
          <div className="mt-1 text-lg font-semibold text-[var(--color-text-primary)]">{kpi.expensesSubmitted}</div>
        </div>
        <div className="p-4 bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-[var(--radius-control)]">
          <div className="text-sm text-[var(--color-text-secondary)]">Expenses - Approved</div>
          <div className="mt-1 text-lg font-semibold text-[var(--color-text-primary)]">{kpi.expensesApproved}</div>
        </div>
        <div className="p-4 bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-[var(--radius-control)]">
          <div className="text-sm text-[var(--color-text-secondary)]">Expenses - Paid</div>
          <div className="mt-1 text-lg font-semibold text-[var(--color-text-primary)]">{kpi.expensesPaid}</div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3 text-[var(--color-text-primary)]">Quick Access</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="p-4 bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-[var(--radius-control)] hover:bg-[var(--color-bg-subtle)] transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-[var(--radius-control)] bg-[var(--color-action-primary)]/10">
                  <link.icon size={20} className="text-[var(--color-action-primary)]" />
                </div>
                <div>
                  <div className="font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-action-primary)]">{link.name}</div>
                  <div className="text-sm text-[var(--color-text-secondary)]">{link.desc}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
