"use client";

import { Search, Bell } from "lucide-react";
import { ThemeToggle } from "@/shared/components/theme-toggle";

export function Topbar() {
  return (
    <header className="sticky top-0 z-20 flex h-[72px] items-center gap-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]/95 backdrop-blur px-4 md:px-6">
      <div className="flex-1">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-secondary)]" />
          <input
            type="search"
            placeholder="Search..."
            className="w-full h-10 pl-9 pr-3 rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-[3px] focus:ring-[var(--color-focus-ring)] focus:ring-offset-[2px] focus:ring-offset-[var(--color-bg-surface)]"
          />
        </div>
      </div>
      <ThemeToggle />
      <button
        className="relative h-10 w-10 rounded-[var(--radius-control)] flex items-center justify-center hover:bg-[var(--color-bg-subtle)]"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4 text-[var(--color-text-secondary)]" />
        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[var(--color-action-primary)] ring-2 ring-[var(--color-bg-surface)]" />
      </button>
    </header>
  );
}
