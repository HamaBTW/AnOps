import type { Metadata } from "next";
import Link from "next/link";
import { getPageWorkspace } from "@/server/tenancy/workspace";
import { listProducts } from "@/server/inventory/catalog.service";
import { productListQuerySchema } from "@/features/inventory/schemas/inventory.schema";
import { PageHeader } from "@/shared/components/data-display/page-header";
import { EmptyState } from "@/shared/components/data-display/empty-state";
import { Pagination } from "@/shared/components/data-display/pagination";
import { StatusBadge } from "@/shared/components/data-display/status-badge";
import { ButtonLink, Button, selectClass } from "@/shared/components/ui/button";
import { formatDecimalString } from "@/shared/lib/format";
import { STOCK_STATUS_LABELS, STOCK_STATUS_TONES } from "@/features/inventory/labels";
import { UNIT_LABELS, type UnitOfMeasure } from "@/shared/domain/units";

export const metadata: Metadata = { title: "Products | AnOps ERP" };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await getPageWorkspace();
  const raw = await searchParams;
  const parsedQuery = productListQuerySchema.safeParse({
    q: typeof raw.q === "string" ? raw.q : undefined,
    status: typeof raw.status === "string" ? raw.status : undefined,
    page: typeof raw.page === "string" ? raw.page : undefined,
  });
  const query = parsedQuery.success ? parsedQuery.data : productListQuerySchema.parse({});
  const result = await listProducts(ctx, query);
  const canManage = ctx.permissions.has("inventory.product.manage");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description={`${result.total} product${result.total === 1 ? "" : "s"} · ${query.status === "all" ? "all statuses" : query.status}`}
        actions={canManage ? <ButtonLink href="/inventory/products/new" variant="primary">New product</ButtonLink> : undefined}
      />

      <form method="get" role="search" className="grid gap-3 sm:grid-cols-[1fr_200px_auto] sm:items-end">
        <div className="space-y-1.5">
          <label htmlFor="q" className="text-sm font-semibold text-[var(--color-text-primary)]">Search by name or SKU</label>
          <input
            id="q"
            name="q"
            defaultValue={query.q}
            placeholder="Starts with…"
            maxLength={80}
            className="w-full min-h-[44px] rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] px-3 text-sm text-[var(--color-text-primary)]"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="status" className="text-sm font-semibold text-[var(--color-text-primary)]">Status</label>
          <select id="status" name="status" defaultValue={query.status} className={selectClass}>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="all">All</option>
          </select>
        </div>
        <Button type="submit">Apply</Button>
      </form>

      {result.items.length === 0 ? (
        query.q || query.status !== "active" ? (
          <p className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5 text-sm text-[var(--color-text-secondary)]">
            No products match these filters.{" "}
            <Link href="/inventory/products" className="underline">Clear filters</Link>
          </p>
        ) : (
          <EmptyState
            title="No products yet"
            description="Products are the items you buy, store, sell, or manufacture. Create your first one to start tracking stock."
            actionHref={canManage ? "/inventory/products/new" : undefined}
            actionLabel={canManage ? "Create a product" : undefined}
          />
        )
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
          <table className="w-full min-w-[720px] text-left text-sm">
            <caption className="sr-only">Products</caption>
            <thead className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">SKU</th>
                <th scope="col" className="px-4 py-3 font-semibold">Name</th>
                <th scope="col" className="px-4 py-3 font-semibold">Category</th>
                <th scope="col" className="px-4 py-3 font-semibold">Unit</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">On hand</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Reorder at</th>
                <th scope="col" className="px-4 py-3 font-semibold">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-subtle)]">
              {result.items.map((product) => (
                <tr key={product.id} className="hover:bg-[var(--color-bg-subtle)]">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/inventory/products/${product.id}`} className="underline-offset-2 hover:underline">
                      {product.sku}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {product.name}
                    {!product.isActive && <span className="ml-2 text-xs text-[var(--color-text-secondary)]">(archived)</span>}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{product.categoryName ?? "—"}</td>
                  <td className="px-4 py-3">{UNIT_LABELS[product.unitOfMeasure as UnitOfMeasure]}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatDecimalString(product.onHand)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatDecimalString(product.reorderPoint)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge label={STOCK_STATUS_LABELS[product.stockStatus]} tone={STOCK_STATUS_TONES[product.stockStatus]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        basePath="/inventory/products"
        page={result.page}
        totalPages={result.totalPages}
        params={{ q: query.q || undefined, status: query.status }}
      />
    </div>
  );
}
