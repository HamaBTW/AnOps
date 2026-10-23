import { ArrowRight } from "lucide-react";
import Link from "next/link";

const modules = [
  {
    name: "CRM",
    description: "Customer relationships and pipeline",
    href: "/crm",
  },
  {
    name: "Sales",
    description: "Quotes, orders, invoicing",
    href: "/sales",
  },
  {
    name: "Finance",
    description: "Accounts, payments, reports",
    href: "/finance",
  },
  {
    name: "Inventory",
    description: "Stock, products, suppliers",
    href: "/inventory",
  },
  {
    name: "Purchasing",
    description: "Purchase orders, vendors",
    href: "/purchasing",
  },
  {
    name: "HR",
    description: "Employees, leave, payroll",
    href: "/hr",
  },
  {
    name: "Projects",
    description: "Tasks, timelines, teams",
    href: "/projects",
  },
  {
    name: "Documents",
    description: "Files, templates, approvals",
    href: "/documents",
  },
];

const stats = [
  { name: "Ordered Sales", value: "€96,000" },
  { name: "Invoiced", value: "€84,000" },
  { name: "Outstanding", value: "€18,000" },
  { name: "Pending Approvals", value: "5" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[48px] leading-[55px] tracking-[-0.03em] font-bold">
          Dashboard
        </h1>
        <p className="mt-2 text-[var(--color-text-secondary)]">
          October 2026 · EUR
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-[var(--radius-card)] p-6"
          >
            <p className="text-sm text-[var(--color-text-secondary)]">{stat.name}</p>
            <p className="text-2xl font-semibold mt-2 numeric">{stat.value}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-6">Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((module) => (
            <Link
              key={module.name}
              href={module.href}
              className="group bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-[var(--radius-card)] p-6 hover:border-[var(--color-border-control)] transition-colors"
            >
              <h3 className="font-semibold mb-1 group-hover:underline">
                {module.name}
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                {module.description}
              </p>
              <div className="flex items-center text-sm font-medium text-[var(--color-text-primary)]">
                <span>Open</span>
                <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-[var(--radius-card)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Business Assistant</h3>
          <span className="text-xs px-2 py-1 rounded-[var(--radius-pill)] bg-[var(--color-action-primary)] text-[var(--color-action-on-primary)]">
            Suggestion · Review required
          </span>
        </div>
        <p className="text-sm text-[var(--color-text-secondary)] mb-4">
          Suggested purchase PO-208 · 120 units × €20 = €2,400 · Luma Supply · Not executed
        </p>
        <p className="text-xs text-[var(--color-text-secondary)] mb-4">
          Only data allowed by your role is used. Nothing is sent or committed without approval.
        </p>
        <button className="h-12 px-5 rounded-[var(--radius-control)] bg-[var(--color-action-primary)] text-[var(--color-action-on-primary)] hover:bg-[var(--color-action-hover)] transition-colors font-semibold">
          Review purchase
        </button>
      </div>
    </div>
  );
}
