import type { Metadata } from "next";
import { getPageWorkspace } from "@/server/tenancy/workspace";
import { supplierOptions } from "@/server/purchasing/supplier.service";
import { listProductOptions } from "@/server/inventory/catalog.service";
import { PageHeader } from "@/shared/components/data-display/page-header";
import { PermissionDenied } from "@/shared/components/data-display/permission-denied";
import { PurchaseOrderForm } from "@/features/purchasing/components/purchase-order-form";

export const metadata: Metadata = { title: "New purchase order | AnOps ERP" };

export default async function NewPurchaseOrderPage() {
  const ctx = await getPageWorkspace();
  if (!ctx.permissions.has("purchasing.order.manage")) return <PermissionDenied backHref="/purchasing/orders" backLabel="Back to orders" />;
  const [suppliers, products] = await Promise.all([supplierOptions(ctx), listProductOptions(ctx)]);
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="New purchase order" description="Creates a draft. Approve it once the supplier and quantities are confirmed." />
      <PurchaseOrderForm
        suppliers={suppliers.map((s) => ({ id: s.id, label: s.name }))}
        products={products.map((p) => ({ id: p.id, label: `${p.sku} · ${p.name} (${p.unitOfMeasure})` }))}
        currencyCode={ctx.currencyCode}
      />
    </div>
  );
}
