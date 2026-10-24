import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPageWorkspace } from "@/server/tenancy/workspace";
import { getBom } from "@/server/manufacturing/bom.service";
import { listProductOptions } from "@/server/inventory/catalog.service";
import { isAppError } from "@/shared/lib/errors";
import { PageHeader } from "@/shared/components/data-display/page-header";
import { StatusBadge } from "@/shared/components/data-display/status-badge";
import { BomActions } from "@/features/manufacturing/components/bom-actions";
import { BomForm } from "@/features/manufacturing/components/bom-form";
import { BOM_STATUS } from "@/features/manufacturing/labels";
import { formatDecimalString } from "@/shared/lib/format";
import { UNIT_LABELS, type UnitOfMeasure } from "@/shared/domain/units";

export const metadata: Metadata = { title: "Bill of materials | AnOps ERP" };

export default async function BomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getPageWorkspace();
  const { id } = await params;
  let bom;
  try {
    bom = await getBom(ctx, id);
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") notFound();
    throw error;
  }
  const status = BOM_STATUS[bom.status];
  const products = bom.permissions.canEdit ? await listProductOptions(ctx) : [];
  const options = products.filter((p) => p.isStorable).map((p) => ({ id: p.id, label: `${p.sku} · ${p.name} (${p.unitOfMeasure})` }));

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${bom.finishedSku} · revision ${bom.revision}`}
        description={bom.finishedName}
        actions={<Link href="/manufacturing/boms" className="inline-flex min-h-[44px] items-center text-sm underline underline-offset-2">Back to BOMs</Link>}
      />
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge label={status.label} tone={status.tone} />
        <span className="text-sm text-[var(--color-text-secondary)]">Active revisions are locked. Work orders keep the components they were created with.</span>
      </div>
      <BomActions bomId={bom.id} version={bom.version} canActivate={bom.permissions.canActivate} canArchive={bom.permissions.canArchive} />

      {bom.permissions.canEdit ? (
        <section aria-labelledby="edit-heading" className="space-y-4">
          <h2 id="edit-heading" className="text-lg font-semibold">Edit draft</h2>
          <BomForm
            products={options}
            bomId={bom.id}
            version={bom.version}
            initial={{
              finishedProductId: bom.finishedProductId,
              notes: bom.notes,
              components: bom.components.map((c) => ({ productId: c.productId, quantityPerUnit: c.quantityPerUnit })),
            }}
          />
        </section>
      ) : (
        <section aria-labelledby="components-heading" className="space-y-3">
          <h2 id="components-heading" className="text-lg font-semibold">Components per unit</h2>
          <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
            <table className="w-full min-w-[420px] text-left text-sm">
              <caption className="sr-only">Components</caption>
              <thead className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Component</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Quantity per unit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)]">
                {bom.components.map((c) => (
                  <tr key={c.productId}>
                    <td className="px-4 py-3"><span className="font-medium">{c.sku}</span><span className="block text-xs text-[var(--color-text-secondary)]">{c.productName}</span></td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatDecimalString(c.quantityPerUnit)} {UNIT_LABELS[c.unitOfMeasure as UnitOfMeasure]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
