import { ModuleTabs } from "@/shared/components/layout/module-tabs";

const TABS = [
  { label: "Work orders", href: "/manufacturing/work-orders" },
  { label: "Bills of materials", href: "/manufacturing/boms" },
];

export default function ManufacturingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <ModuleTabs tabs={TABS} />
      {children}
    </div>
  );
}
