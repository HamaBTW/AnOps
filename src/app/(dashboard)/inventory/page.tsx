import type { Metadata } from "next";
import { getPageWorkspace } from "@/server/tenancy/workspace";
import { getInventoryOverview } from "@/server/inventory/overview.service";
import { PageHeader } from "@/shared/components/data-display/page-header";
import { EmptyState } from "@/shared/components/data-display/empty-state";
import { ButtonLink } from "@/shared/components/ui/button";
import { formatDateTime, formatDecimalString, formatMoney } from "@/shared/lib/format";
import { StatusBadge } from "@/shared/components/data-display/status-badge";
import { MOVEMENT_LABELS } from "@/features/inventory/labels";
import { formatMoneyAmount } from "@/shared/lib/fixed-point";
import { StatCard, type StatTone } from "@/shared/components/data-display/stat-card";
import { AlertTriangle, Boxes, ClipboardList, Factory, FolderTree, PackageCheck, PackageX, Warehouse, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const metadata: Metadata = {
  title: "Inventory | AnOps ERP",
};

export default async function InventoryOverviewPage() {
  const ctx = await getPageWorkspace();
  const overview = await getInventoryOverview(ctx);

  const kpis: { label: string; value: string; href: string; icon: LucideIcon; tone?: StatTone; hint?: string }[] = [
    { label: "Active products", value: String(overview.activeProducts), href: "/inventory/products", icon: Boxes, tone: "blue" },
    { label: "Low stock", value: String(overview.lowStockProducts), href: "/inventory/stock", icon: AlertTriangle, tone: "warning", hint: "At or below reorder point" },
    { label: "Out of stock", value: String(overview.outOfStockProducts), href: "/inventory/stock", icon: PackageX, tone: "error" },
    { label: "Stock value", value: formatMoney(formatMoneyAmount(overview.stockValueMilli, 3), overview.currencyCode), href: "/inventory/stock", icon: Wallet, tone: "success" },
    { label: "Warehouses", value: String(overview.activeWarehouses), href: "/inventory/warehouses", icon: Warehouse, tone: "teal" },
    { label: "Categories", value: String(overview.categories), href: "/inventory/categories", icon: FolderTree, tone: "violet" },
    { label: "Open purchase orders", value: String(overview.pendingPurchaseOrders), href: "/purchasing/orders", icon: ClipboardList, tone: "blue" },
    { label: "Receipts to post", value: String(overview.goodsReceiptsAwaitingPosting), href: "/purchasing/receipts", icon: PackageCheck, tone: "teal" },
    { label: "Open work orders", value: String(overview.openWorkOrders), href: "/manufacturing/work-orders", icon: Factory, tone: "violet" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Inventory overview"
        description="Figures are calculated from your company's records. Low stock uses each product's reorder point."
      />

      {overview.activeProducts === 0 && overview.activeWarehouses === 0 ? (
        <EmptyState
          title="Set up your inventory"
          description="Start by creating a warehouse to hold stock, then add the products you track."
          actionHref="/inventory/warehouses"
          actionLabel="Create a warehouse"
        />
      ) : null}

      <section aria-labelledby="kpi-heading" className="space-y-3">
        <h2 id="kpi-heading" className="sr-only">Key figures</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-5">
          {kpis.map((kpi) => (
            <StatCard key={kpi.label} {...kpi} />
          ))}
        </div>
      </section>

      <section aria-labelledby="recent-heading" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="recent-heading" className="text-lg font-semibold text-[var(--color-text-primary)]">Recent stock movements</h2>
          <ButtonLink href="/inventory/stock">View all</ButtonLink>
        </div>
        {overview.recentMovements.length === 0 ? (
          <EmptyState title="No stock movements yet" description="Movements appear when stock is received, issued, transferred, adjusted, or produced." />
        ) : (
          <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">When</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Product</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Warehouse</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Type</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)]">
                {overview.recentMovements.map((movement) => (
                  <tr key={movement.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--color-text-secondary)]">{formatDateTime(movement.createdAt)}</td>
                    <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">{movement.productSku}</td>
                    <td className="px-4 py-3">{movement.warehouseCode}</td>
                    <td className="px-4 py-3">
                      <StatusBadge label={MOVEMENT_LABELS[movement.movementType] ?? movement.movementType} tone="info" />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {movement.deltaMicro < 0 ? "−" : "+"}
                      {formatDecimalString(movement.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
