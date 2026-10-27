import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFinanceService } from "@/server/services/finance.service";
import { InvoiceDetailActions } from "@/features/finance/components/invoice-detail-actions";
import { StatusBadge, type BadgeTone } from "@/shared/components/data-display/status-badge";

export const metadata: Metadata = {
  title: "Invoice Details | Finance | AnOps ERP",
  description: "View, print, and manage customer invoice details.",
};

function statusTone(status: string): BadgeTone {
  switch (status) {
    case "paid":
      return "success";
    case "partially_paid":
      return "warning";
    case "overdue":
    case "voided":
      return "error";
    case "posted":
      return "info";
    default:
      return "neutral";
  }
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let invoice: any = null;
  let canPost = false;

  try {
    const service = await getFinanceService();
    invoice = await service.getInvoice(id);
    canPost = service.hasPermission("finance.invoice.post");
  } catch {
    notFound();
  }

  if (!invoice) {
    notFound();
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-TN", { style: "currency", currency: invoice.currency || "TND" }).format(n || 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Action Bar (hidden when printing) */}
      <InvoiceDetailActions
        invoiceId={invoice.id}
        invoiceNumber={invoice.invoiceNumber}
        status={invoice.status}
        canPost={canPost}
      />

      {/* Official Invoice Document Card */}
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-8 shadow-sm space-y-8 print:border-none print:shadow-none print:p-0 print:bg-white print:text-black">
        {/* Header: Company & Invoice Info */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-[var(--color-border-subtle)] pb-6 print:border-gray-300">
          <div className="space-y-1.5">
            <div className="text-xl font-bold tracking-tight text-[var(--color-text-primary)] print:text-black">
              {invoice.company?.name || "AnOps Corporation"}
            </div>
            {invoice.company?.taxId && (
              <div className="text-xs text-[var(--color-text-secondary)] print:text-gray-600">
                Matricule Fiscale / Tax ID: <span className="font-mono font-medium">{invoice.company.taxId}</span>
              </div>
            )}
            {invoice.company?.address && (
              <div className="text-xs text-[var(--color-text-secondary)] print:text-gray-600">
                {invoice.company.address}
              </div>
            )}
            {invoice.company?.email && (
              <div className="text-xs text-[var(--color-text-secondary)] print:text-gray-600">
                {invoice.company.email} {invoice.company.phone ? `· ${invoice.company.phone}` : ""}
              </div>
            )}
          </div>

          <div className="text-left sm:text-right space-y-1">
            <div className="text-2xl font-extrabold uppercase tracking-wide text-[var(--color-text-primary)] print:text-black">
              Invoice
            </div>
            <div className="font-mono text-base font-semibold text-[var(--color-action-primary)] print:text-black">
              {invoice.invoiceNumber}
            </div>
            <div className="pt-1">
              <StatusBadge
                label={invoice.status.replace("_", " ").toUpperCase()}
                tone={statusTone(invoice.status)}
              />
            </div>
          </div>
        </div>

        {/* Client & Billing Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
          <div className="p-4 rounded-[var(--radius-control)] bg-[var(--color-bg-subtle)]/40 border border-[var(--color-border-subtle)] space-y-1.5 print:border-gray-200 print:bg-gray-50">
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] print:text-gray-500">
              Billed To
            </div>
            <div className="text-base font-bold text-[var(--color-text-primary)] print:text-black">
              {invoice.customer?.name || "Direct Customer"}
            </div>
            {invoice.customer?.taxId && (
              <div className="text-xs text-[var(--color-text-secondary)] print:text-gray-600">
                Tax ID / MF: <span className="font-mono font-medium">{invoice.customer.taxId}</span>
              </div>
            )}
            {invoice.customer?.address && (
              <div className="text-xs text-[var(--color-text-secondary)] print:text-gray-600">
                {invoice.customer.address}
              </div>
            )}
            {invoice.customer?.email && (
              <div className="text-xs text-[var(--color-text-secondary)] print:text-gray-600">
                {invoice.customer.email} {invoice.customer.phone ? `· ${invoice.customer.phone}` : ""}
              </div>
            )}
          </div>

          <div className="p-4 rounded-[var(--radius-control)] bg-[var(--color-bg-subtle)]/40 border border-[var(--color-border-subtle)] space-y-2 text-xs print:border-gray-200 print:bg-gray-50">
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] print:text-gray-500">
              Invoice Details
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)] print:text-gray-600">Issue Date:</span>
              <span className="font-medium text-[var(--color-text-primary)] print:text-black">{invoice.issueDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)] print:text-gray-600">Due Date:</span>
              <span className="font-medium text-[var(--color-text-primary)] print:text-black">{invoice.dueDate || "Upon receipt"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)] print:text-gray-600">Currency:</span>
              <span className="font-semibold text-[var(--color-text-primary)] print:text-black">{invoice.currency}</span>
            </div>
            {invoice.voidReason && (
              <div className="pt-1 text-[var(--color-status-error)] border-t border-[var(--color-border-subtle)]">
                <span className="font-semibold">Void Reason:</span> {invoice.voidReason}
              </div>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)]/60 text-[var(--color-text-secondary)] font-medium text-xs uppercase tracking-wider print:border-gray-300 print:bg-gray-100 print:text-gray-700">
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Item Description</th>
                <th className="py-3 px-4 text-right">Qty</th>
                <th className="py-3 px-4 text-right">Unit Price</th>
                <th className="py-3 px-4 text-right">VAT Rate</th>
                <th className="py-3 px-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-subtle)] print:divide-gray-200">
              {invoice.lines.map((l: any, idx: number) => (
                <tr key={l.id} className="text-[var(--color-text-primary)] print:text-black">
                  <td className="py-3 px-4 text-xs text-[var(--color-text-secondary)] print:text-gray-500">
                    {idx + 1}
                  </td>
                  <td className="py-3 px-4 font-medium">
                    {l.description}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums">
                    {l.quantity}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums">
                    {fmt(l.unitPrice)}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-xs text-[var(--color-text-secondary)] print:text-gray-600">
                    {l.taxRate ? `${l.taxRate}%` : "0%"}
                  </td>
                  <td className="py-3 px-4 text-right font-medium tabular-nums">
                    {fmt(l.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals & Financial Summary */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-4 border-t border-[var(--color-border-subtle)] print:border-gray-300">
          <div className="sm:max-w-md space-y-3 text-xs text-[var(--color-text-secondary)] print:text-gray-600">
            {invoice.terms && (
              <div>
                <span className="font-semibold text-[var(--color-text-primary)] print:text-black block mb-0.5">
                  Payment Terms
                </span>
                {invoice.terms}
              </div>
            )}
            {invoice.notes && (
              <div>
                <span className="font-semibold text-[var(--color-text-primary)] print:text-black block mb-0.5">
                  Notes
                </span>
                {invoice.notes}
              </div>
            )}
          </div>

          <div className="w-full sm:w-80 space-y-2 text-sm bg-[var(--color-bg-subtle)]/30 p-4 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] print:border-gray-200 print:bg-transparent">
            <div className="flex justify-between text-[var(--color-text-secondary)] print:text-gray-600">
              <span>Subtotal (HT):</span>
              <span className="font-medium text-[var(--color-text-primary)] print:text-black">{fmt(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-[var(--color-text-secondary)] print:text-gray-600">
              <span>VAT / TVA:</span>
              <span className="font-medium text-[var(--color-text-primary)] print:text-black">{fmt(invoice.taxTotal)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-[var(--color-text-primary)] border-t border-[var(--color-border-subtle)] pt-2 print:border-gray-300 print:text-black">
              <span>Total Due (TTC):</span>
              <span className="text-[var(--color-action-primary)] print:text-black">{fmt(invoice.total)}</span>
            </div>
            <div className="flex justify-between text-xs text-[var(--color-status-success)] pt-1">
              <span>Amount Paid:</span>
              <span>{fmt(invoice.amountPaid)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-[var(--color-text-primary)] border-t border-[var(--color-border-subtle)] pt-2 print:border-gray-300 print:text-black">
              <span>Balance Remaining:</span>
              <span>{fmt(invoice.balance)}</span>
            </div>
          </div>
        </div>

        {/* Payment History Section (if any payments are recorded) */}
        {invoice.allocations && invoice.allocations.length > 0 && (
          <div className="border-t border-[var(--color-border-subtle)] pt-4 space-y-2 print:border-gray-300">
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] print:text-gray-500">
              Payment Transactions Applied
            </div>
            <div className="space-y-1 text-xs">
              {invoice.allocations.map((a: any, i: number) => (
                <div
                  key={a.id || i}
                  className="flex justify-between p-2 rounded bg-[var(--color-bg-subtle)]/40 text-[var(--color-text-primary)] print:border print:border-gray-200"
                >
                  <span>Allocated on {a.allocatedAt.slice(0, 10)}</span>
                  <span className="font-medium text-[var(--color-status-success)]">
                    +{fmt(a.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
