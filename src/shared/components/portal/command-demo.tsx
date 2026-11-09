"use client";

import { useEffect, useRef, useState } from "react";
import { IconSparkles } from "@/shared/components/ui/brand-icons";
import { cn } from "@/shared/lib/utils";

type Scenario = {
  prompt: string;
  module: string;
  kind: "answer" | "proposal";
  title: string;
  rows: [string, string][];
  footer: string;
};

/** Scripted, illustrative scenarios that mirror real Command Center behaviour (reads answer, writes propose). */
const scenarios: Scenario[] = [
  {
    prompt: "/stock low warehouse:Main",
    module: "Inventory",
    kind: "answer",
    title: "3 products are below their reorder level",
    rows: [
      ["PNL-AL-2M · Aluminium panel", "38 left"],
      ["BLT-M8-50 · Steel bolts", "120 left"],
      ["PKG-BOX-L · Large box", "64 left"],
    ],
    footer: "Read-only answer · from Inventory",
  },
  {
    prompt: "Draft a purchase order for 120 aluminium panels from Sahel Metals",
    module: "Purchasing",
    kind: "proposal",
    title: "Create purchase order (draft)",
    rows: [
      ["Supplier", "Sahel Metals"],
      ["Line", "120 × Aluminium panel 2M"],
      ["Status after confirm", "Draft · needs approval"],
    ],
    footer: "Nothing changes until you confirm",
  },
  {
    prompt: "Who is absent today in Operations?",
    module: "HR & Payroll",
    kind: "answer",
    title: "2 people are on approved leave today",
    rows: [
      ["Operations · Team lead", "Annual leave"],
      ["Operations · Technician", "Sick leave"],
    ],
    footer: "Shown because your role can view team leave",
  },
];

const TYPE_MS = 28;
const HOLD_MS = 3600;

export function CommandDemo() {
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const scenario = scenarios[index];
  const done = reduced || typed >= scenario.prompt.length;
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (paused || reduced) return;
    if (typed < scenario.prompt.length) {
      timer.current = window.setTimeout(() => setTyped((value) => value + 1), TYPE_MS);
    } else {
      timer.current = window.setTimeout(() => {
        setIndex((value) => (value + 1) % scenarios.length);
        setTyped(0);
      }, HOLD_MS);
    }
    return () => window.clearTimeout(timer.current);
  }, [typed, paused, reduced, scenario.prompt.length]);

  const go = (next: number) => {
    setIndex((next + scenarios.length) % scenarios.length);
    setTyped(reduced ? Number.MAX_SAFE_INTEGER : 0);
  };

  return (
    <div
      className="relative overflow-hidden rounded-[18px] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] shadow-[0_40px_90px_-50px_rgba(17,31,29,0.55)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)] px-4 py-3">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--color-action-primary)] text-[#111F1D]">
            <IconSparkles size={13} />
          </span>
          AnOps AI · Command Center
        </span>
        <span className="hidden text-xs text-[var(--color-text-secondary)] sm:inline">Illustrative demo</span>
      </div>

      <div className="space-y-4 p-4 sm:p-5" aria-live="polite" aria-atomic="true">
        <div className="ml-auto max-w-[92%] rounded-[14px] rounded-br-[4px] bg-[#111F1D] px-4 py-3 font-mono text-[13px] leading-relaxed text-[#F7F7F2] dark:bg-[#0b1513]">
          <span className="sr-only">Request: {scenario.prompt}</span>
          <span aria-hidden="true">
            {scenario.prompt.slice(0, done ? undefined : typed)}
            {!done && <span className="portal-caret ml-0.5 inline-block h-[14px] w-[7px] translate-y-[2px] bg-[#C8F03E]" />}
          </span>
        </div>

        <div
          className={cn(
            "rounded-[14px] border p-4",
            scenario.kind === "proposal"
              ? "border-[color-mix(in_oklab,var(--color-action-primary)_60%,var(--color-border-subtle))] bg-[color-mix(in_oklab,var(--color-action-primary)_8%,var(--color-bg-surface))]"
              : "border-[var(--color-border-subtle)]",
            done ? "opacity-100 transition-[opacity,transform] duration-500 ease-[var(--ease-out)]" : "invisible translate-y-2 opacity-0"
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">{scenario.title}</p>
            <span className="rounded-full bg-[var(--color-bg-subtle)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--color-text-secondary)]">
              {scenario.module}
            </span>
          </div>
          <dl className="mt-3 divide-y divide-[var(--color-border-subtle)] text-sm">
            {scenario.rows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 py-2">
                <dt className="min-w-0 truncate text-[var(--color-text-secondary)]">{label}</dt>
                <dd className="shrink-0 font-medium text-[var(--color-text-primary)]">{value}</dd>
              </div>
            ))}
          </dl>
          {scenario.kind === "proposal" && (
            <div aria-hidden="true" className="mt-3 flex gap-2">
              <span className="inline-flex h-9 items-center rounded-[8px] bg-[var(--color-action-primary)] px-4 text-sm font-semibold text-[#111F1D]">Confirm</span>
              <span className="inline-flex h-9 items-center rounded-[8px] border border-[var(--color-border-control)] px-4 text-sm font-semibold text-[var(--color-text-primary)]">Cancel</span>
            </div>
          )}
          <p className="mt-3 text-xs text-[var(--color-text-secondary)]">{scenario.footer}</p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[var(--color-border-subtle)] px-4 py-2.5">
        <div className="flex gap-1.5" role="group" aria-label="Choose an example">
          {scenarios.map((item, i) => (
            <button
              key={item.prompt}
              type="button"
              onClick={() => go(i)}
              aria-label={`Example ${i + 1}: ${item.module}`}
              aria-current={i === index ? "true" : undefined}
              className="flex h-8 w-8 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
            >
              <span className={cn("h-1.5 rounded-full transition-all duration-300", i === index ? "w-5 bg-[var(--color-text-primary)]" : "w-1.5 bg-[var(--color-border-control)]")} />
            </button>
          ))}
        </div>
        {!reduced && (
          <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            className="min-h-[32px] rounded-[8px] px-2 text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
          >
            {paused ? "Play" : "Pause"}
          </button>
        )}
      </div>
    </div>
  );
}
