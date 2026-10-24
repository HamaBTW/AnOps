"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useEffect, useRef, useState } from "react";
import { IconChevronDown, IconClose, IconMenu } from "@/shared/components/ui/brand-icons";
import { ThemeToggle } from "@/shared/components/theme-toggle";
import { categories, appsInCategory } from "@/shared/config/catalog";
import { primaryNav } from "@/shared/config/site";
import { btnPrimary } from "@/shared/components/marketing/styles";
import { CategoryIcon } from "@/shared/components/marketing/category-icon";
import { StatusBadge } from "@/shared/components/marketing/status-badge";
import { cn } from "@/shared/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const [appsOpen, setAppsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const appsPanelId = useId();
  const mobilePanelId = useId();

  useEffect(() => {
    if (!appsOpen) return;
    const onPointer = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setAppsOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAppsOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [appsOpen]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const closeAll = () => {
    setAppsOpen(false);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-canvas)]/95 backdrop-blur">
      <div className="mx-auto flex h-[72px] w-full max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center" onClick={closeAll} aria-label="AnOps home">
          <img
            src="/brand-kit/01-brand-identity/logos/anops-logo-horizontal-dark.svg"
            alt=""
            className="h-7 block dark:hidden"
          />
          <img
            src="/brand-kit/01-brand-identity/logos/anops-logo-horizontal-white.svg"
            alt=""
            className="h-7 hidden dark:block"
          />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-expanded={appsOpen}
              aria-controls={appsPanelId}
              onClick={() => setAppsOpen((open) => !open)}
              className={cn(
                "inline-flex min-h-[44px] items-center gap-1.5 rounded-[var(--radius-control)] px-3 text-sm font-medium hover:bg-[var(--color-bg-subtle)]",
                isActive("/apps") ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]"
              )}
            >
              Apps
              <IconChevronDown size={12} className={cn("transition-transform", appsOpen && "rotate-180")} />
            </button>
            <div
              id={appsPanelId}
              hidden={!appsOpen}
              className="absolute left-0 top-full mt-2 w-[760px] max-w-[calc(100vw-2rem)] rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5 shadow-[0_10px_40px_-10px_rgba(17,31,29,0.25)] menu-in"
            >
              <div className="grid grid-cols-3 gap-x-6 gap-y-5">
                {categories.map((category) => (
                  <div key={category.id}>
                    <Link
                      href={`/apps?category=${category.id}`}
                      onClick={closeAll}
                      className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)] hover:underline"
                    >
                      <CategoryIcon id={category.id} size={16} className="text-[var(--color-text-secondary)]" />
                      {category.label}
                    </Link>
                    <ul className="mt-2 space-y-1">
                      {appsInCategory(category.id)
                        .slice(0, 4)
                        .map((app) => (
                          <li key={app.slug}>
                            <Link
                              href={`/apps/${app.slug}`}
                              onClick={closeAll}
                              className="flex items-center justify-between gap-2 rounded-[var(--radius-control)] px-2 py-1.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]"
                            >
                              {app.name}
                              <StatusBadge status={app.status} />
                            </Link>
                          </li>
                        ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-[var(--color-border-subtle)] pt-4 text-sm">
                <span className="text-[var(--color-text-secondary)]">InP = In Progress · CS = Coming Soon</span>
                <Link href="/apps" onClick={closeAll} className="font-semibold text-[var(--color-text-primary)] hover:underline">
                  Browse all apps
                </Link>
              </div>
            </div>
          </div>
          {primaryNav
            .filter((item) => item.href !== "/apps")
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-[44px] items-center rounded-[var(--radius-control)] px-3 text-sm font-medium hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]",
                  isActive(item.href) ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]"
                )}
              >
                {item.label}
              </Link>
            ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/login"
            className="hidden min-h-[44px] items-center rounded-[var(--radius-control)] px-3 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)] sm:inline-flex"
          >
            Sign in
          </Link>
          <Link href="/contact" className={cn(btnPrimary, "hidden px-4 sm:inline-flex")}>
            Contact us
          </Link>
          <button
            type="button"
            aria-expanded={mobileOpen}
            aria-controls={mobilePanelId}
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            onClick={() => setMobileOpen((open) => !open)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] lg:hidden"
          >
            {mobileOpen ? <IconClose size={14} /> : <IconMenu size={18} />}
          </button>
        </div>
      </div>

      <div
        id={mobilePanelId}
        hidden={!mobileOpen}
        className="max-h-[calc(100dvh-72px)] overflow-y-auto border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-canvas)] lg:hidden"
      >
        <nav aria-label="Mobile" className="menu-in mx-auto max-w-[1200px] space-y-1 px-4 py-4">
          <Link
            href="/apps"
            onClick={closeAll}
            className="flex min-h-[44px] items-center rounded-[var(--radius-control)] px-3 text-base font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]"
          >
            All apps
          </Link>
          <div className="pl-3 pt-2">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">Categories</p>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/apps?category=${category.id}`}
                onClick={closeAll}
                className="flex min-h-[44px] items-center gap-2 rounded-[var(--radius-control)] px-3 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]"
              >
                <CategoryIcon id={category.id} size={16} />
                {category.label}
              </Link>
            ))}
          </div>
          {primaryNav
            .filter((item) => item.href !== "/apps")
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeAll}
                className="flex min-h-[44px] items-center rounded-[var(--radius-control)] px-3 text-base font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]"
              >
                {item.label}
              </Link>
            ))}
          <div className="grid grid-cols-2 gap-2 pt-3">
            <Link href="/login" onClick={closeAll} className="flex min-h-[44px] items-center justify-center rounded-[var(--radius-control)] border border-[var(--color-border-control)] text-sm font-semibold text-[var(--color-text-primary)]">
              Sign in
            </Link>
            <Link href="/contact" onClick={closeAll} className={cn(btnPrimary, "justify-center")}>
              Contact us
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
