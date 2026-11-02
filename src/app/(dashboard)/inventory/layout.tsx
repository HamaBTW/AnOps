import { ModuleTabs } from "@/shared/components/layout/module-tabs";

const TABS = [
  { label: "Overview", href: "/inventory" },
  { label: "Products", href: "/inventory/products" },
  { label: "Categories", href: "/inventory/categories" },
  { label: "Warehouses", href: "/inventory/warehouses" },
  { label: "Stock", href: "/inventory/stock" },
  { label: "Guided setup", href: "/inventory/setup" },
];

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <ModuleTabs tabs={TABS} />
      {children}
    </div>
  );
}
