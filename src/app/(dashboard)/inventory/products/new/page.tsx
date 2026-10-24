import type { Metadata } from "next";
import { getPageWorkspace } from "@/server/tenancy/workspace";
import { listCategories } from "@/server/inventory/catalog.service";
import { PageHeader } from "@/shared/components/data-display/page-header";
import { PermissionDenied } from "@/shared/components/data-display/permission-denied";
import { ProductForm } from "@/features/inventory/components/product-form";

export const metadata: Metadata = { title: "New product | AnOps ERP" };

export default async function NewProductPage() {
  const ctx = await getPageWorkspace();
  if (!ctx.permissions.has("inventory.product.manage")) return <PermissionDenied backHref="/inventory/products" backLabel="Back to products" />;
  const categories = await listCategories(ctx);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="New product" description="Set the SKU, unit, cost and reorder point. Stock is added separately through receipts or stock moves." />
      <ProductForm
        mode="create"
        canManage
        categories={categories.filter((c) => c.isActive).map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
