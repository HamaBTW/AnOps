"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatedIcon } from "@/shared/components/portal/animated-icon";
import { apps, getApp } from "@/shared/config/catalog";
import { cn } from "@/shared/lib/utils";

/**
 * Hover or focus an app to light up the apps it shares records with.
 * Links are real; the highlight is a progressive enhancement.
 */
export function EcosystemMap() {
  const [active, setActive] = useState<string | null>(null);
  const current = active ? getApp(active) : undefined;
  const linked = new Set(current ? [current.slug, ...current.connectsWith] : []);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" onMouseLeave={() => setActive(null)}>
        {apps.map((app) => {
          const dim = current && !linked.has(app.slug);
          const isActive = active === app.slug;
          return (
            <li key={app.slug}>
              <Link
                href={`/apps/${app.slug}`}
                onMouseEnter={() => setActive(app.slug)}
                onFocus={() => setActive(app.slug)}
                onBlur={() => setActive(null)}
                style={{ ["--accent" as string]: app.accent }}
                className={cn(
                  "group flex h-full items-center gap-3 rounded-[14px] border bg-[var(--color-bg-surface)] p-3 transition-[opacity,border-color,box-shadow,transform] duration-300 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)]",
                  isActive
                    ? "border-[var(--accent)] shadow-[0_16px_40px_-24px_var(--accent)] motion-safe:-translate-y-0.5"
                    : linked.has(app.slug)
                      ? "border-[color-mix(in_oklab,var(--accent)_60%,var(--color-border-subtle))]"
                      : "border-[var(--color-border-subtle)]",
                  dim && "opacity-40"
                )}
              >
                <AnimatedIcon icon={app.icon} size={40} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold leading-tight text-[var(--color-text-primary)]">{app.name}</span>
                  <span className="block truncate text-xs text-[var(--color-text-secondary)]">
                    {app.status === "available" ? "Available" : "Coming soon"}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <aside
        aria-live="polite"
        className="hidden rounded-[16px] border border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)] p-5 lg:block"
      >
        {current ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">Shares records with</p>
            <p className="mt-2 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">{current.name}</p>
            <ul className="mt-4 space-y-2">
              {current.connectsWith.map((slug) => {
                const app = getApp(slug);
                return app ? (
                  <li key={slug} className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
                    <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: app.accent }} />
                    {app.name}
                  </li>
                ) : null;
              })}
            </ul>
            <p className="mt-4 text-sm leading-relaxed text-[var(--color-text-secondary)]">{current.tagline}</p>
          </>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">How it fits together</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              Hover or focus an application to see which others it works with. A supplier, a product or an employee is recorded once and
              used everywhere it is needed.
            </p>
          </>
        )}
      </aside>
    </div>
  );
}
