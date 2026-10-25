import { getFinanceService } from "@/server/services/finance.service";
import Link from "next/link";

export default async function FinanceInvoicesPage() {
  let invoices: any[] = [];
  try {
    const service = await getFinanceService();
    invoices = await service.listInvoices();
  } catch {
    invoices = [];
  }

  const fmt = (n: number, c: string) => new Intl.NumberFormat("fr-TN", { style: "currency", currency: c || "TND" }).format(n || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground">Create, post and track invoices</p>
        </div>
        <Link href="/finance/invoices/new" className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">New Invoice</Link>
      </div>
      <div className="p-4 bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-[var(--radius-control)] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border-subtle)]">
              <th className="text-left py-2 pr-4 text-[var(--color-text-secondary)]">Invoice</th>
              <th className="text-left py-2 pr-4 text-[var(--color-text-secondary)]">Status</th>
              <th className="text-left py-2 pr-4 text-[var(--color-text-secondary)]">Issue Date</th>
              <th className="text-right py-2 pr-4 text-[var(--color-text-secondary)]">Total</th>
              <th className="text-right py-2 pr-4 text-[var(--color-text-secondary)]">Paid</th>
              <th className="text-right py-2 pr-4 text-[var(--color-text-secondary)]">Balance</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr><td colSpan={6} className="py-4 text-[var(--color-text-secondary)]">No invoices yet</td></tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-[var(--color-border-subtle)] last:border-0">
                  <td className="py-2 pr-4 text-[var(--color-text-primary)]">{inv.invoiceNumber}</td>
                  <td className="py-2 pr-4 capitalize text-[var(--color-text-primary)]">{inv.status}</td>
                  <td className="py-2 pr-4 text-[var(--color-text-primary)]">{inv.issueDate}</td>
                  <td className="py-2 pr-4 text-right text-[var(--color-text-primary)]">{fmt(inv.total, inv.currency)}</td>
                  <td className="py-2 pr-4 text-right text-[var(--color-text-primary)]">{fmt(inv.amountPaid, inv.currency)}</td>
                  <td className="py-2 pr-4 text-right text-[var(--color-text-primary)]">{fmt(inv.balance, inv.currency)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
