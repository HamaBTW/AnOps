import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { getPageWorkspace } from "@/server/tenancy/workspace";
import { listReceipts } from "@/server/purchasing/receipt.service";
import { PageHeader } from "@/shared/components/data-display/page-header";
import { EmptyState } from "@/shared/components/data-display/empty-state";
import { Pagination } from "@/shared/components/data-display/pagination";
import { StatusBadge } from "@/shared/components/data-display/status-badge";
import { RECEIPT_STATUS } from "@/features/purchasing/labels";
import { formatDate } from "@/shared/lib/format";

export const metadata: Metadata = { title: "Goods receipts | AnOps ERP" };

const querySchema = z
  .object({
    status: z.enum(["all", "draft", "posted", "cancelled"]).catch("all"),
    page: z.coerce.number().int().min(1).max(1000).catch(1),
  })
  .strict();

export default async function ReceiptsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await getPageWorkspace();
  const raw = await searchParams;
  const query = querySchema.parse({ status: raw.status, page: raw.page });
  const result = await listReceipts(ctx, { status: query.status === "all" ? undefined : query.status, page: query.page });

  return (
    <div className="space-y-6">
      <PageHeader title="Goods receipts" description="Drafts are reviewed and posted. Posting is the only step that increases stock." />
      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label htmlFor="status" className="text-sm font-semibold">Status</label>
          <select id="status" name="status" defaultValue={query.status} className="min-h-[44px] rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] px-3 text-sm">
            <option value="all">All</option>
            <option value="draft">Draft</option>
            <option value="posted">Posted</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <button type="submit" className="min-h-[44px] rounded-[var(--radius-control)] border border-[var(--color-border-control)] px-4 text-sm font-semibold">Apply</button>
      </form>

      {result.items.length === 0 ? (
        <EmptyState title="No receipts" description="Receipts are created from an approved purchase order when goods arrive." actionHref="/purchasing/orders" actionLabel="Go to orders" />
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">Goods receipts</caption>
            <thead className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Receipt</th>
                <th scope="col" className="px-4 py-3 font-semibold">Order</th>
                <th scope="col" className="px-4 py-3 font-semibold">Supplier</th>
                <th scope="col" className="px-4 py-3 font-semibold">Warehouse</th>
                <th scope="col" className="px-4 py-3 font-semibold">Created</th>
                <th scope="col" className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-subtle)]">
              {result.items.map((receipt) => (
                <tr key={receipt.id} className="hover:bg-[var(--color-bg-subtle)]">
                  <td className="px-4 py-3 font-medium"><Link href={`/purchasing/receipts/${receipt.id}`} className="underline-offset-2 hover:underline">{receipt.receiptNumber}</Link></td>
                  <td className="px-4 py-3">{receipt.orderNumber}</td>
                  <td className="px-4 py-3">{receipt.supplierName}</td>
                  <td className="px-4 py-3">{receipt.warehouseCode}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-[var(--color-text-secondary)]">{formatDate(receipt.createdAt)}</td>
                  <td className="px-4 py-3"><StatusBadge label={RECEIPT_STATUS[receipt.status].label} tone={RECEIPT_STATUS[receipt.status].tone} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination basePath="/purchasing/receipts" page={result.page} totalPages={result.totalPages} params={{ status: query.status }} />
    </div>
  );
}
