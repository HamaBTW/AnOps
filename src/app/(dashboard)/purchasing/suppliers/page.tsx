import type { Metadata } from "next";
import { getPageWorkspace } from "@/server/tenancy/workspace";
import { listSuppliers } from "@/server/purchasing/supplier.service";
import { PageHeader } from "@/shared/components/data-display/page-header";
import { Pagination } from "@/shared/components/data-display/pagination";
import { SupplierManager } from "@/features/purchasing/components/supplier-manager";
import { ExportExcelButton } from "@/shared/components/data-display/export-excel-button";
import { exportUrl } from "@/shared/lib/download";
import { z } from "zod";
import { Search } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { FilterBar, FilterField, filterInputClass } from "@/shared/components/data-display/filter-bar";

export const metadata: Metadata = { title: "Suppliers | AnOps ERP" };

export default async function SuppliersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await getPageWorkspace();
  const raw = await searchParams;
  const q = typeof raw.q === "string" ? raw.q.slice(0, 80) : "";
  const page = z.coerce.number().int().min(1).max(1000).catch(1).parse(raw.page);
  const result = await listSuppliers(ctx, { q, page });
  return (
    <div className="space-y-6">
      <PageHeader
        title="Suppliers"
        description="Vendors you buy from. Suppliers with orders are deactivated, never deleted."
        actions={<ExportExcelButton href={exportUrl("suppliers", { q })} />}
      />
      <FilterBar role="search" aria-label="Search suppliers">
        <FilterField label="Search by name" htmlFor="q" className="sm:w-72">
          <input id="q" name="q" defaultValue={q} maxLength={80} placeholder="e.g. Acme Metals" className={filterInputClass} />
        </FilterField>
        <Button type="submit" variant="primary" className="w-full sm:w-auto"><Search aria-hidden className="size-4" />Search</Button>
      </FilterBar>
      <SupplierManager suppliers={result.items} canManage={ctx.permissions.has("purchasing.supplier.manage")} />
      <Pagination basePath="/purchasing/suppliers" page={result.page} totalPages={result.totalPages} params={{ q: q || undefined }} />
    </div>
  );
}
