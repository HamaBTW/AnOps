import { ModuleTabs } from "@/shared/components/layout/module-tabs";

const TABS = [
  { label: "Overview", href: "/marketing" },
  { label: "Contacts", href: "/marketing/contacts" },
  { label: "Tags", href: "/marketing/tags" },
  { label: "Audiences", href: "/marketing/audiences" },
  { label: "Campaigns", href: "/marketing/campaigns" },
  { label: "Templates", href: "/marketing/templates" },
  { label: "Social", href: "/marketing/social" },
  { label: "AI copy", href: "/marketing/ai" },
  { label: "Analytics", href: "/marketing/analytics" },
  { label: "Integrations", href: "/marketing/integrations" },
];

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <ModuleTabs tabs={TABS} />
      {children}
    </div>
  );
}
