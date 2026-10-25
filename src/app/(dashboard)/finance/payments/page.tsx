import { getFinanceService } from "@/server/services/finance.service";
import Link from "next/link";

export default async function FinancePaymentsPage() {
  let payments: any[] = [];
  try {
    const service = await getFinanceService();
    payments = await service.listPayments();
  } catch {
    payments = [];
  }

  const fmt = (n: number, c: string) => new Intl.NumberFormat("fr-TN", { style: "currency", currency: c || "TND" }).format(n || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
          <p className="text-sm text-muted-foreground">Record payments and allocate to invoices</p>
        </div>
        <Link href="/finance/payments/new" className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">Record Payment</Link>
      </div>
      <div className="p-4 bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-[var(--radius-control)] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border-subtle)]">
              <th className="text-left py-2 pr-4 text-[var(--color-text-secondary)]">Date</th>
              <th className="text-left py-2 pr-4 text-[var(--color-text-secondary)]">Method</th>
              <th className="text-left py-2 pr-4 text-[var(--color-text-secondary)]">Reference</th>
              <th className="text-right py-2 pr-4 text-[var(--color-text-secondary)]">Amount</th>
              <th className="text-right py-2 pr-4 text-[var(--color-text-secondary)]">Unallocated</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr><td colSpan={5} className="py-4 text-[var(--color-text-secondary)]">No payments yet</td></tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id} className="border-b border-[var(--color-border-subtle)] last:border-0">
                  <td className="py-2 pr-4 text-[var(--color-text-primary)]">{p.paymentDate}</td>
                  <td className="py-2 pr-4 capitalize text-[var(--color-text-primary)]">{p.method}</td>
                  <td className="py-2 pr-4 text-[var(--color-text-primary)]">{p.reference || "-"}</td>
                  <td className="py-2 pr-4 text-right text-[var(--color-text-primary)]">{fmt(p.amount, p.currency)}</td>
                  <td className="py-2 pr-4 text-right text-[var(--color-text-primary)]">{fmt(p.unallocatedAmount, p.currency)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
