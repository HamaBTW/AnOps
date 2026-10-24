import { IconArrowRight, IconSparkles } from "@/shared/components/ui/brand-icons";
import { StatusBadge } from "@/shared/components/marketing/status-badge";

const kpis = [
  { label: "Ordered sales", value: "€96,000", sub: "+20.0% vs last month" },
  { label: "Invoiced", value: "€84,000", sub: "€18,000 outstanding" },
  { label: "Low stock", value: "12 SKUs", sub: "4 need attention" },
  { label: "Pending approvals", value: "5", sub: "Review required" },
];

const bars = [38, 52, 46, 64, 58, 76, 70, 88];

function delay(ms: number) {
  return { ["--reveal-delay" as string]: `${ms}ms` } as React.CSSProperties;
}

export function DashboardPreview() {
  return (
    <div
      role="img"
      aria-label="Illustrative AnOps dashboard preview showing sales, invoicing, stock and a business assistant suggestion"
      className="reveal relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4 shadow-[0_1px_1px_rgba(17,31,29,0.02),0_12px_40px_-16px_rgba(17,31,29,0.18)] sm:p-5"
      style={delay(120)}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="sheen absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-[var(--color-bg-subtle)] to-transparent opacity-60" />
      </div>

      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-xs text-[var(--color-text-secondary)]">October 2026 · EUR</p>
          <p className="mt-0.5 flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
            <span className="live-dot relative inline-flex h-2 w-2 rounded-full text-[var(--color-status-success)] bg-[var(--color-status-success)]" />
            Your operation, connected.
          </p>
        </div>
        <span className="rounded-[var(--radius-pill)] bg-[var(--color-bg-subtle)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
          Illustrative data
        </span>
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-2.5">
        {kpis.map((kpi, index) => (
          <div
            key={kpi.label}
            className="kpi-in lift rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] p-3"
            style={delay(220 + index * 90)}
          >
            <p className="text-[11px] text-[var(--color-text-secondary)]">{kpi.label}</p>
            <p className="mt-1 text-lg font-semibold tracking-[-0.01em] text-[var(--color-text-primary)]">{kpi.value}</p>
            <p className="mt-0.5 text-[11px] text-[var(--color-text-secondary)]">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div className="relative mt-4 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-[var(--color-text-primary)]">Sales performance</p>
          <p className="text-[11px] text-[var(--color-text-secondary)]">Last 8 weeks</p>
        </div>
        <div className="mt-3 flex h-24 items-end gap-2" aria-hidden="true">
          {bars.map((height, index) => (
            <span
              key={index}
              className="bar-grow flex-1 rounded-t-[4px] bg-[var(--color-action-primary)]"
              style={{ height: `${height}%`, opacity: index === bars.length - 1 ? 1 : 0.55, ...delay(380 + index * 70) }}
            />
          ))}
        </div>
      </div>

      <div
        className="kpi-in relative mt-4 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)] p-3"
        style={delay(1000)}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-primary)]">
            <IconSparkles size={14} />
            Business Assistant
          </p>
          <StatusBadge status="in-progress" />
        </div>
        <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-primary)]">
          Suggested purchase order: 120 units from a supplier for an estimated €2,400. Not sent until approved.
        </p>
        <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-primary)] transition-transform duration-300 hover:translate-x-0.5">
          Review draft
          <IconArrowRight size={12} />
        </div>
      </div>
    </div>
  );
}
