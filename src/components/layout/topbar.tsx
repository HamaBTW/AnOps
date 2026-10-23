import { Search, Bell } from "lucide-react";

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 bg-[var(--color-bg-surface)] border-b border-[var(--color-border-subtle)]">
      <div className="flex h-[72px] items-center gap-4 px-6">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-secondary)]" />
            <input
              type="search"
              placeholder="Search records, tasks, documents"
              className="w-full h-12 pl-9 pr-4 rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-3 focus:ring-[var(--color-focus-ring)] focus:ring-offset-2"
            />
          </div>
        </div>
        <button
          className="h-12 w-12 rounded-[var(--radius-control)] flex items-center justify-center hover:bg-[var(--color-bg-subtle)] transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5 text-[var(--color-text-secondary)]" strokeWidth={1.7} />
        </button>
      </div>
    </header>
  );
}
