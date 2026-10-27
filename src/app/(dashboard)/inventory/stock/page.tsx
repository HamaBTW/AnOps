import type { Metadata } from "next";
import { getPageWorkspace } from "@/server/tenancy/workspace";
import { listProductOptions, warehouseOptions } from "@/server/inventory/catalog.service";
import { listStockBalances, listStockMovements } from "@/server/inventory/stock.service";
import { PageHeader } from "@/shared/components/data-display/page-header";
import { Pagination } from "@/shared/components/data-display/pagination";
import { StatusBadge } from "@/shared/components/data-display/status-badge";
import { EmptyState } from "@/shared/components/data-display/empty-state";
import { StockOperationForm, type StockOperation } from "@/features/inventory/components/stock-operation-form";
import { STOCK_STATUS_LABELS, STOCK_STATUS_TONES, MOVEMENT_LABELS } from "@/features/inventory/labels";
import { ExportExcelButton } from "@/shared/components/data-display/export-excel-button";
import { exportUrl } from "@/shared/lib/download";
import { formatDateTime, formatDecimalString } from "@/shared/lib/format";
import { z } from "zod";

export const metadata: Metadata = { title: "Stock | AnOps ERP" };

const pageParam = z.coerce.number().int().min(1).max(1000).catch(1);

export default async function StockPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await getPageWorkspace();
  const raw = await searchParams;
  const balancePage = pageParam.parse(typeof raw.balancePage === "string" ? raw.balancePage : 1);
  const movementPage = pageParam.parse(typeof raw.movementPage === "string" ? raw.movementPage : 1);

  const [balances, movements, products, warehouses] = await Promise.all([
    listStockBalances(ctx, { page: balancePage }),
    listStockMovements(ctx, { page: movementPage }),
    listProductOptions(ctx),
    warehouseOptions(ctx),
  ]);

  const operations: StockOperation[] = [];
  if (ctx.permissions.has("inventory.stock.move")) operations.push("receive", "issue", "transfer");
  if (ctx.permissions.has("inventory.stock.adjust")) operations.push("adjust");

  return (
    <div className="space-y-10">
      <PageHeader title="Stock" description="On-hand quantities by product and warehouse. Every change is recorded in the movement history." />

      <section aria-labelledby="balances-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="balances-heading" className="text-lg font-semibold">On hand</h2>
          <ExportExcelButton href={exportUrl("stock-on-hand", {})} ariaLabel="Export stock on hand to Excel" />
        </div>
        {balances.items.length === 0 ? (
          <EmptyState
            title="No stock recorded"
            description="Stock appears here after you receive goods, post a purchase receipt, or complete a work order."
          />
        ) : (
          <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
            <table className="w-full min-w-[640px] text-left text-sm">
              <caption className="sr-only">Stock balances by product and warehouse</caption>
              <thead className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Product</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Warehouse</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">On hand</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Reorder at</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)]">
                {balances.items.map((row) => (
                  <tr key={`${row.productId}-${row.warehouseId}`}>
                    <td className="px-4 py-3">
                      <span className="font-medium">{row.productSku}</span>
                      <span className="block text-xs text-[var(--color-text-secondary)]">{row.productName}</span>
                    </td>
                    <td className="px-4 py-3">{row.warehouseCode}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatDecimalString(row.onHand)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.reorderPointMicro > 0 ? formatDecimalString(row.reorderPoint) : "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge label={STOCK_STATUS_LABELS[row.stockStatus]} tone={STOCK_STATUS_TONES[row.stockStatus]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination basePath="/inventory/stock" page={balances.page} totalPages={balances.totalPages} params={{ movementPage: String(movementPage) }} />
      </section>

      {operations.length > 0 && (
        <section aria-labelledby="operations-heading" className="space-y-3 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5">
          <h2 id="operations-heading" className="text-lg font-semibold">Record a stock change</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Issues and transfers cannot take a warehouse below zero. Count corrections require a reason and are restricted to owners and admins.
          </p>
          <StockOperationForm products={products} warehouses={warehouses} allowedOperations={operations} />
        </section>
      )}

      <section aria-labelledby="movements-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="movements-heading" className="text-lg font-semibold">Movement history</h2>
          <ExportExcelButton href={exportUrl("stock-movements", {})} ariaLabel="Export recent stock movements to Excel" />
        </div>
        {movements.items.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)]">No movements yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
            <table className="w-full min-w-[720px] text-left text-sm">
              <caption className="sr-only">Stock movement history</caption>
              <thead className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">When</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Product</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Warehouse</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Type</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Change</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)]">
                {movements.items.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--color-text-secondary)]">{formatDateTime(m.createdAt)}</td>
                    <td className="px-4 py-3">{m.productSku}</td>
                    <td className="px-4 py-3">{m.warehouseCode}</td>
                    <td className="px-4 py-3">{MOVEMENT_LABELS[m.movementType] ?? m.movementType}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{m.deltaMicro < 0 ? "−" : "+"}{formatDecimalString(m.quantity)}</td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">{m.reason || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination basePath="/inventory/stock" page={movements.page} totalPages={movements.totalPages} params={{ balancePage: String(balancePage) }} />
      </section>
      {warehouses.length === 0 && (
        <p className="text-sm text-[var(--color-text-secondary)]">
          No active warehouses. <a className="underline" href="/inventory/warehouses">Create one</a> before recording stock.
        </p>
      )}
    </div>
  );
}
