import type { Metadata } from "next";
import { getFinanceService } from "@/server/services/finance.service";
import Link from "next/link";
import { ButtonLink } from "@/shared/components/ui/button";
import { StatusBadge, type BadgeTone } from "@/shared/components/data-display/status-badge";
import { IconReceipt } from "@/shared/components/ui/brand-icons";

export const metadata: Metadata = {
  title: "Invoices | Finance | AnOps ERP",
  description: "Create, view, and track customer invoices.",
};

function statusTone(status: string): BadgeTone {
  switch (status) {
    case "paid":
      return "success";
    case "partially_paid":
      return "warning";
    case "overdue":
      return "error";
    case "posted":
      return "info";
    default:
      return "neutral";
  }
}

export default async function FinanceInvoicesPage() {
  let invoices: any[] = [];
  try {
    const service = await getFinanceService();
    invoices = await service.listInvoices();
  } catch {
    invoices = [];
  }

  const fmt = (n: number, c: string) =>
    new Intl.NumberFormat("fr-TN", { style: "currency", currency: c || "TND" }).format(n || 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
            Customer Invoices
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Create, issue, and reconcile billing documents tied to customer accounts
          </p>
        </div>
        <ButtonLink href="/finance/invoices/new" variant="primary">
          + New Invoice
        </ButtonLink>
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)]/50 text-[var(--color-text-secondary)] font-medium">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Issue Date</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-subtle)]">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[var(--color-text-secondary)]">
                    <div className="space-y-3">
                      <IconReceipt size={32} className="mx-auto text-[var(--color-text-secondary)] opacity-50" />
                      <div className="font-medium text-[var(--color-text-primary)]">No invoices issued yet</div>
                      <p className="text-xs">Create your first invoice to bill customers for products or services.</p>
                      <ButtonLink href="/finance/invoices/new" variant="primary">
                        Create Invoice
                      </ButtonLink>
                    </div>
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[var(--color-bg-subtle)]/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-[var(--color-text-primary)]">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 px-4 text-[var(--color-text-primary)]">
                      {inv.customer?.name ? (
                        <div>
                          <div className="font-medium">{inv.customer.name}</div>
                          {inv.customer.email && (
                            <div className="text-xs text-[var(--color-text-secondary)]">
                              {inv.customer.email}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[var(--color-text-secondary)] text-xs">Direct Customer</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge label={inv.status.replace("_", " ")} tone={statusTone(inv.status)} />
                    </td>
                    <td className="py-3 px-4 text-[var(--color-text-primary)] text-xs">{inv.issueDate}</td>
                    <td className="py-3 px-4 text-[var(--color-text-secondary)] text-xs">
                      {inv.dueDate || "—"}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-[var(--color-text-primary)]">
                      {fmt(inv.total, inv.currency)}
                    </td>
                    <td className="py-3 px-4 text-right text-[var(--color-status-success)]">
                      {fmt(inv.amountPaid, inv.currency)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-[var(--color-text-primary)]">
                      {fmt(inv.balance, inv.currency)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
