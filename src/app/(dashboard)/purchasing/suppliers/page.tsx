import type { Metadata } from "next";
import { getPageWorkspace } from "@/server/tenancy/workspace";
import { listSuppliers } from "@/server/purchasing/supplier.service";
import { PageHeader } from "@/shared/components/data-display/page-header";
import { Pagination } from "@/shared/components/data-display/pagination";
import { SupplierManager } from "@/features/purchasing/components/supplier-manager";
import { z } from "zod";

export const metadata: Metadata = { title: "Suppliers | AnOps ERP" };

export default async function SuppliersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await getPageWorkspace();
  const raw = await searchParams;
  const q = typeof raw.q === "string" ? raw.q.slice(0, 80) : "";
  const page = z.coerce.number().int().min(1).max(1000).catch(1).parse(raw.page);
  const result = await listSuppliers(ctx, { q, page });
  return (
    <div className="space-y-6">
      <PageHeader title="Suppliers" description="Vendors you buy from. Suppliers with orders are deactivated, never deleted." />
      <form method="get" role="search" className="max-w-md space-y-1.5">
        <label htmlFor="q" className="text-sm font-semibold">Search by name</label>
        <input id="q" name="q" defaultValue={q} maxLength={80} className="w-full min-h-[44px] rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] px-3 text-sm" />
      </form>
      <SupplierManager suppliers={result.items} canManage={ctx.permissions.has("purchasing.supplier.manage")} />
      <Pagination basePath="/purchasing/suppliers" page={result.page} totalPages={result.totalPages} params={{ q: q || undefined }} />
    </div>
  );
}
