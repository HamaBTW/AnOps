import { getFinanceService } from "@/server/services/finance.service";
import Link from "next/link";

export default async function FinanceExpensesPage() {
  let expenses: any[] = [];
  try {
    const service = await getFinanceService();
    expenses = await service.listExpenses();
  } catch {
    expenses = [];
  }

  const fmt = (n: number, c: string) => new Intl.NumberFormat("fr-TN", { style: "currency", currency: c || "TND" }).format(n || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
          <p className="text-sm text-muted-foreground">Track expenses, approvals and payments</p>
        </div>
        <Link href="/finance/expenses/new" className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">New Expense</Link>
      </div>
      <div className="p-4 bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-[var(--radius-control)] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border-subtle)]">
              <th className="text-left py-2 pr-4 text-[var(--color-text-secondary)]">Date</th>
              <th className="text-left py-2 pr-4 text-[var(--color-text-secondary)]">Vendor</th>
              <th className="text-left py-2 pr-4 text-[var(--color-text-secondary)]">Description</th>
              <th className="text-left py-2 pr-4 text-[var(--color-text-secondary)]">Status</th>
              <th className="text-right py-2 pr-4 text-[var(--color-text-secondary)]">Total</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr><td colSpan={5} className="py-4 text-[var(--color-text-secondary)]">No expenses yet</td></tr>
            ) : (
              expenses.map((e) => (
                <tr key={e.id} className="border-b border-[var(--color-border-subtle)] last:border-0">
                  <td className="py-2 pr-4 text-[var(--color-text-primary)]">{e.expenseDate}</td>
                  <td className="py-2 pr-4 text-[var(--color-text-primary)]">{e.vendor || "-"}</td>
                  <td className="py-2 pr-4 text-[var(--color-text-primary)]">{e.description}</td>
                  <td className="py-2 pr-4 capitalize text-[var(--color-text-primary)]">{e.status}</td>
                  <td className="py-2 pr-4 text-right text-[var(--color-text-primary)]">{fmt(e.total, e.currency)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
