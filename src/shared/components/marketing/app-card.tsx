import Link from "next/link";
import type { App } from "@/shared/config/catalog";
import { getCategory } from "@/shared/config/catalog";
import { CategoryIcon } from "@/shared/components/marketing/category-icon";
import { StatusBadge } from "@/shared/components/marketing/status-badge";
import { card } from "@/shared/components/marketing/styles";

export function AppCard({ app }: { app: App }) {
  return (
    <Link
      href={`/apps/${app.slug}`}
      className={`${card} group flex h-full flex-col gap-3 p-5 lift hover:border-[var(--color-border-control)]`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] bg-[var(--color-bg-subtle)] text-[var(--color-text-primary)]">
          <CategoryIcon id={app.category} size={18} />
        </span>
        <StatusBadge status={app.status} />
      </div>
      <div>
        <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{app.name}</h3>
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{getCategory(app.category).label}</p>
      </div>
      <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{app.summary}</p>
    </Link>
  );
}
