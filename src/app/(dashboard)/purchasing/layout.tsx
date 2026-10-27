import { ModuleTabs } from "@/shared/components/layout/module-tabs";

const TABS = [
  { label: "Orders", href: "/purchasing/orders" },
  { label: "Receipts", href: "/purchasing/receipts" },
  { label: "Suppliers", href: "/purchasing/suppliers" },
  { label: "Replenishment", href: "/purchasing/replenishment" },
];

export default function PurchasingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <ModuleTabs tabs={TABS} />
      {children}
    </div>
  );
}
