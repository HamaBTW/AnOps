"use client";

import { IconSearch, IconNotification, IconMenu } from "@/shared/components/ui/brand-icons";
import { ThemeToggle } from "@/shared/components/theme-toggle";
import { CompanySwitcher } from "@/features/company/components/company-switcher";
import type { Company } from "@/features/company/types";

export function Topbar({
  onMenuClick,
  companies = [],
  activeCompanyId = "",
}: {
  onMenuClick?: () => void;
  companies?: Company[];
  activeCompanyId?: string;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-[72px] items-center gap-2 sm:gap-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]/95 backdrop-blur px-3 sm:px-4 md:px-6">
      {onMenuClick && (
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden h-10 w-10 rounded-[var(--radius-control)] flex items-center justify-center hover:bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] shrink-0"
          aria-label="Open navigation"
        >
          <IconMenu size={18} />
        </button>
      )}

      {companies.length > 0 && (
        <div className="shrink-0">
          <CompanySwitcher companies={companies} activeCompanyId={activeCompanyId} />
        </div>
      )}

      <div className="flex-1">
        <div className="relative max-w-md">
          <IconSearch
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] pointer-events-none"
          />
          <input
            type="search"
            placeholder="Search..."
            className="w-full h-10 pl-9 pr-3 rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-[3px] focus:ring-[var(--color-focus-ring)] focus:ring-offset-[2px] focus:ring-offset-[var(--color-bg-surface)]"
          />
        </div>
      </div>
      <ThemeToggle />
      <button
        className="relative h-10 w-10 rounded-[var(--radius-control)] flex items-center justify-center hover:bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]"
        aria-label="Notifications"
      >
        <IconNotification size={18} />
        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[var(--color-action-primary)] ring-2 ring-[var(--color-bg-surface)]" />
      </button>
    </header>
  );
}
