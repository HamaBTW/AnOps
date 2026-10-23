import { ArrowRight } from "lucide-react";
import Link from "next/link";

const kpis = [
  { label: "Ordered Sales", value: "€96,000", sub: "+20.0% vs Sep" },
  { label: "Invoiced", value: "€84,000", sub: "€18,000 outstanding" },
  { label: "Low Stock", value: "12 SKUs", sub: "4 need attention" },
  { label: "Pending Approvals", value: "5", sub: "Review required" },
];

const modules = [
  { name: "CRM", href: "/crm" },
  { name: "Sales", href: "/sales" },
  { name: "Finance", href: "/finance" },
  { name: "Inventory", href: "/inventory" },
  { name: "Purchasing", href: "/purchasing" },
  { name: "HR", href: "/hr" },
  { name: "Projects", href: "/projects" },
  { name: "Documents", href: "/documents" },
];

export default function Page() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-[40px] md:text-[48px] leading-[46px] md:leading-[55px] tracking-[-0.03em] text-[var(--color-text-primary)]">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">1–31 October 2026 · EUR</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-6"
          >
            <p className="text-sm text-[var(--color-text-secondary)]">{kpi.label}</p>
            <p className="mt-2 text-[28px] leading-[33px] font-semibold numeric tracking-[-0.01em] text-[var(--color-text-primary)]">
              {kpi.value}
            </p>
            <p className="mt-1.5 text-xs text-[var(--color-text-secondary)]">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl md:text-2xl text-[var(--color-text-primary)]">Modules</h2>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((module) => (
            <Link
              key={module.name}
              href={module.href}
              className="group flex items-center justify-between rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-4 py-3.5 transition-all hover:border-[var(--color-border-control)]"
            >
              <span className="text-sm font-medium text-[var(--color-text-primary)]">{module.name}</span>
              <ArrowRight className="h-4 w-4 text-[var(--color-text-secondary)] transition-transform group-hover:translate-x-1" />
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] px-6 py-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Business Assistant</h2>
            <span className="inline-flex items-center rounded-[var(--radius-pill)] bg-[var(--color-action-primary)] px-2.5 py-1 text-xs font-semibold text-[var(--color-action-on-primary)]">
              Suggestion · Review required
            </span>
          </div>
        </div>
        <div className="px-6 py-5 space-y-3">
          <p className="text-sm leading-relaxed text-[var(--color-text-primary)]">
            Suggested purchase PO-208 · 120 units × €20 = €2,400 · Luma Supply · Not executed
          </p>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Only data allowed by your role is used. Nothing is sent or committed without approval.
          </p>
          <button className="mt-2 h-11 rounded-[var(--radius-control)] bg-[var(--color-action-primary)] px-5 text-sm font-semibold text-[var(--color-action-on-primary)] transition-colors hover:bg-[var(--color-action-hover)]">
            Review purchase
          </button>
        </div>
      </section>
    </div>
  );
}
