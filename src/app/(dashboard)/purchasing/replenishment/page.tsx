import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { getPageWorkspace } from "@/server/tenancy/workspace";
import { getReplenishmentProposal, listReplenishmentProposals } from "@/server/purchasing/replenishment.service";
import { warehouseOptions } from "@/server/inventory/catalog.service";
import { supplierOptions } from "@/server/purchasing/supplier.service";
import { isAppError } from "@/shared/lib/errors";
import { PageHeader } from "@/shared/components/data-display/page-header";
import { EmptyState } from "@/shared/components/data-display/empty-state";
import { Pagination } from "@/shared/components/data-display/pagination";
import { StatusBadge } from "@/shared/components/data-display/status-badge";
import type { BadgeTone } from "@/shared/components/data-display/status-badge";
import { ReplenishmentGenerateForm } from "@/features/purchasing/components/replenishment-generate-form";
import { ReplenishmentProposalPanel } from "@/features/purchasing/components/replenishment-proposal-panel";
import { formatDateTime } from "@/shared/lib/format";

export const metadata: Metadata = { title: "Replenishment | AnOps ERP" };

const PROPOSAL_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  proposed: { label: "Ready to review", tone: "info" },
  converting: { label: "Needs recovery", tone: "warning" },
  converted: { label: "Converted", tone: "success" },
};

const pageParam = z.coerce.number().int().min(1).max(1000).catch(1);
const objectIdPattern = /^[a-f0-9]{24}$/i;

export default async function ReplenishmentPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await getPageWorkspace();
  const raw = await searchParams;
  const page = pageParam.parse(typeof raw.page === "string" ? raw.page : 1);
  const selectedId = typeof raw.proposal === "string" && objectIdPattern.test(raw.proposal) ? raw.proposal.toLowerCase() : undefined;

  const [list, warehouses, suppliers] = await Promise.all([
    listReplenishmentProposals(ctx, { page }),
    warehouseOptions(ctx),
    supplierOptions(ctx),
  ]);
  const detail = selectedId
    ? await getReplenishmentProposal(ctx, selectedId).catch((error: unknown) => {
        if (isAppError(error) && error.code === "NOT_FOUND") return null;
        throw error;
      })
    : null;

  const canGenerate = ctx.permissions.has("purchasing.order.manage");
  const canConvert = ctx.permissions.has("purchasing.order.approve") && ctx.permissions.has("purchasing.order.manage");
  const activeWarehouses = warehouses.map((w) => ({ id: w.id, code: w.code, name: w.name }));

  return (
    <div className="space-y-10">
      <PageHeader
        title="Replenishment"
        description="Suggested purchase quantities from recent consumption. Generating a proposal changes no stock. Converting one creates a draft order that still needs approval."
      />

      <section aria-labelledby="generate-heading" className="space-y-3 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5">
        <h2 id="generate-heading" className="text-lg font-semibold">Generate a proposal</h2>
        {canGenerate ? (
          <ReplenishmentGenerateForm warehouses={activeWarehouses} />
        ) : (
          <p className="text-sm text-[var(--color-text-secondary)]">You can review proposals. Generating one needs order management permission.</p>
        )}
      </section>

      <section aria-labelledby="list-heading" className="space-y-3">
        <h2 id="list-heading" className="text-lg font-semibold">Recent proposals</h2>
        {list.items.length === 0 ? (
          <EmptyState title="No proposals yet" description="Generate a proposal to see suggested purchases for a warehouse." />
        ) : (
          <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
            <table className="w-full min-w-[640px] text-left text-sm">
              <caption className="sr-only">Replenishment proposals</caption>
              <thead className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Generated</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Warehouse</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Days</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Products</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-4 py-3 font-semibold"><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)]">
                {list.items.map((item) => (
                  <tr key={item.id} aria-current={item.id === selectedId ? "true" : undefined}>
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--color-text-secondary)]">{formatDateTime(item.generatedAt)}</td>
                    <td className="px-4 py-3">{item.warehouseCode}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{item.horizonDays}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{item.lineCount}</td>
                    <td className="px-4 py-3">
                      <StatusBadge label={PROPOSAL_STATUS[item.status]?.label ?? item.status} tone={PROPOSAL_STATUS[item.status]?.tone ?? "neutral"} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link className="underline" href={`/purchasing/replenishment?proposal=${item.id}&page=${list.page}`}>Open</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination basePath="/purchasing/replenishment" page={list.page} totalPages={list.totalPages} params={{ proposal: selectedId }} />
      </section>

      {detail && <ReplenishmentProposalPanel proposal={detail} suppliers={suppliers} canConvert={canConvert} />}
      {selectedId && !detail && <p className="text-sm text-[var(--color-text-secondary)]">That proposal was not found. It may belong to another company or have been removed.</p>}
    </div>
  );
}
