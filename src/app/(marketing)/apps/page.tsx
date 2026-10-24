import type { Metadata } from "next";
import { AppsDirectory } from "@/app/(marketing)/apps/apps-directory";
import { container, eyebrow, headingXl, lead, sectionY } from "@/shared/components/marketing/styles";
import { categories, type CategoryId } from "@/shared/config/catalog";
import { StatusBadge } from "@/shared/components/marketing/status-badge";

export const metadata: Metadata = {
  title: "Apps",
  description: "Browse the AnOps application directory: sales, finance, supply chain, HR, marketing, productivity, AI and IoT.",
};

export default async function AppsPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const params = await searchParams;
  const initialCategory = categories.find((category) => category.id === params.category)?.id as CategoryId | undefined;

  return (
    <div className={`${container} ${sectionY} scroll-reveal`}>
      <p className={eyebrow}>Application directory</p>
      <h1 className={`${headingXl} mt-3 max-w-3xl`}>Every operation, one app at a time.</h1>
      <p className={`${lead} mt-5 max-w-2xl`}>
        Find the apps you need. Each one shows its status, and every app is designed to share data with the rest of the platform.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-[var(--color-text-secondary)]">
        <span>Status key:</span>
        <StatusBadge status="in-progress" />
        <span>In Progress</span>
        <StatusBadge status="coming-soon" />
        <span>Coming Soon</span>
      </div>
      <div className="mt-10">
        <AppsDirectory initialCategory={initialCategory} />
      </div>
    </div>
  );
}
