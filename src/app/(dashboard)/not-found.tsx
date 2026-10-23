import { DashboardShell } from "@/shared/components/layout/dashboard-shell";

export default function NotFound() {
  return (
    <DashboardShell>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <h1 className="text-5xl tracking-[-0.03em] text-[var(--color-text-primary)]">404</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">Page not found</p>
          <a
            href="/"
            className="inline-flex h-11 items-center rounded-[var(--radius-control)] bg-[var(--color-action-primary)] px-5 text-sm font-semibold text-[var(--color-action-on-primary)] hover:bg-[var(--color-action-hover)]"
          >
            Back to dashboard
          </a>
        </div>
      </div>
    </DashboardShell>
  );
}
