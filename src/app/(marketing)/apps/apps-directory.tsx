"use client";

import { useMemo, useState } from "react";
import { AppCard } from "@/shared/components/marketing/app-card";
import { btnSecondary } from "@/shared/components/marketing/styles";
import { apps, categories, type AppStatus, type CategoryId } from "@/shared/config/catalog";
import { IconSearch } from "@/shared/components/ui/brand-icons";
import { cn } from "@/shared/lib/utils";

const statusFilters: { value: "all" | AppStatus; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "in-progress", label: "In Progress (InP)" },
  { value: "coming-soon", label: "Coming Soon (CS)" },
  { value: "available", label: "Available" },
];

const chip =
  "inline-flex min-h-[44px] items-center rounded-[var(--radius-pill)] border px-4 text-sm font-medium transition-colors";

export function AppsDirectory({ initialCategory }: { initialCategory?: CategoryId }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryId | "all">(initialCategory ?? "all");
  const [status, setStatus] = useState<"all" | AppStatus>("all");

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    return apps.filter((app) => {
      if (category !== "all" && app.category !== category) return false;
      if (status !== "all" && app.status !== status) return false;
      if (!term) return true;
      return (
        app.name.toLowerCase().includes(term) ||
        app.summary.toLowerCase().includes(term) ||
        app.highlights.some((item) => item.toLowerCase().includes(term))
      );
    });
  }, [query, category, status]);

  const reset = () => {
    setQuery("");
    setCategory("all");
    setStatus("all");
  };

  return (
    <div>
      <div className="space-y-5">
        <div className="relative max-w-xl">
          <label htmlFor="app-search" className="sr-only">
            Search applications
          </label>
          <IconSearch size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
          <input
            id="app-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search apps, features or keywords"
            className="h-12 w-full rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] pl-11 pr-4 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-[3px] focus:ring-[var(--color-focus-ring)] focus:ring-offset-[2px] focus:ring-offset-[var(--color-bg-canvas)]"
          />
        </div>

        <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={category === "all"}
            onClick={() => setCategory("all")}
            className={cn(chip, category === "all" ? "border-[var(--color-action-on-primary)] bg-[var(--color-action-primary)] text-[var(--color-action-on-primary)]" : "border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]")}
          >
            All categories
          </button>
          {categories.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={category === item.id}
              onClick={() => setCategory(item.id)}
              className={cn(chip, category === item.id ? "border-[var(--color-action-on-primary)] bg-[var(--color-action-primary)] text-[var(--color-action-on-primary)]" : "border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]")}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="status-filter" className="text-sm text-[var(--color-text-secondary)]">
            Status
          </label>
          <select
            id="status-filter"
            value={status}
            onChange={(event) => setStatus(event.target.value as "all" | AppStatus)}
            className="min-h-[44px] rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] px-3 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-[3px] focus:ring-[var(--color-focus-ring)]"
          >
            {statusFilters.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
          <p aria-live="polite" className="ml-auto text-sm text-[var(--color-text-secondary)]">
            {results.length} of {apps.length} apps
          </p>
        </div>
      </div>

      {results.length > 0 ? (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((app) => (
            <li key={app.slug}>
              <AppCard app={app} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-10 rounded-[var(--radius-card)] border border-dashed border-[var(--color-border-control)] p-10 text-center">
          <p className="text-base font-semibold text-[var(--color-text-primary)]">No apps match these filters.</p>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">Try a different keyword or clear the filters.</p>
          <button type="button" onClick={reset} className={`${btnSecondary} mt-6`}>
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
