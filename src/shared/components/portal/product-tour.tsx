"use client";

import Link from "next/link";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { AppPreview } from "@/shared/components/portal/app-preview";
import { AnimatedIcon } from "@/shared/components/portal/animated-icon";
import { IconArrowRight, IconCheck } from "@/shared/components/ui/brand-icons";
import type { App } from "@/shared/config/catalog";
import { cn } from "@/shared/lib/utils";

/** Accessible tabs (roving focus, arrow keys) presenting each app with an illustrative screen. */
export function ProductTour({ apps }: { apps: App[] }) {
  const [selected, setSelected] = useState(0);
  const baseId = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const app = apps[selected];

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    let next = selected;
    if (event.key in keys) next = (selected + keys[event.key] + apps.length) % apps.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = apps.length - 1;
    else return;
    event.preventDefault();
    setSelected(next);
    tabs.current[next]?.focus();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr] lg:gap-10">
      <div
        role="tablist"
        aria-label="Applications"
        aria-orientation="vertical"
        onKeyDown={onKey}
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0"
      >
        {apps.map((item, i) => (
          <button
            key={item.slug}
            ref={(node) => {
              tabs.current[i] = node;
            }}
            id={`${baseId}-tab-${i}`}
            role="tab"
            type="button"
            aria-selected={i === selected}
            aria-controls={`${baseId}-panel`}
            tabIndex={i === selected ? 0 : -1}
            onClick={() => setSelected(i)}
            style={{ ["--accent" as string]: item.accent }}
            className={cn(
              "group relative flex min-h-[48px] shrink-0 items-center gap-3 rounded-[12px] px-3 py-2 text-left text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)]",
              i === selected
                ? "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] shadow-[0_8px_24px_-16px_rgba(17,31,29,0.45)] ring-1 ring-[var(--color-border-subtle)]"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]"
            )}
          >
            <span aria-hidden="true" className={cn("absolute left-0 top-1/2 hidden h-6 w-[3px] -translate-y-1/2 rounded-full bg-[var(--accent)] lg:block", i === selected ? "opacity-100" : "opacity-0")} />
            <AnimatedIcon icon={item.icon} size={32} play={i === selected ? "always" : "hover"} />
            <span className="whitespace-nowrap">{item.name}</span>
          </button>
        ))}
      </div>

      <div id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-tab-${selected}`} className="min-w-0">
        <div key={app.slug} className="grid gap-6 xl:grid-cols-[1.25fr_1fr] motion-safe:animate-[anops-rise_500ms_var(--ease-out)_both]">
          <AppPreview app={app} />
          <div>
            <p className="font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">{app.tagline}</p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">{app.summary}</p>
            <ul className="mt-5 space-y-3">
              {app.features.slice(0, 4).map((feature) => (
                <li key={feature.title} className="flex gap-3 text-sm">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-action-primary)] text-[#111F1D]">
                    <IconCheck size={10} />
                  </span>
                  <span>
                    <span className="font-semibold text-[var(--color-text-primary)]">{feature.title}. </span>
                    <span className="text-[var(--color-text-secondary)]">{feature.body}</span>
                  </span>
                </li>
              ))}
            </ul>
            <Link href={`/apps/${app.slug}`} className="mt-6 inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)] underline decoration-[var(--color-border-control)] underline-offset-[6px] hover:decoration-[var(--color-text-primary)]">
              Explore {app.name}
              <IconArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
