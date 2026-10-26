"use client";

import { AlertTriangle, Info, X } from "lucide-react";

type MarketingDialogProps = {
  open: boolean;
  title: string;
  description: string;
  tone?: "warning" | "info";
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
};

/** A consistent, accessible confirmation surface for consequential marketing actions. */
export function MarketingDialog({
  open,
  title,
  description,
  tone = "warning",
  confirmLabel,
  onCancel,
  onConfirm,
  busy = false,
}: MarketingDialogProps) {
  if (!open) return null;

  const Icon = tone === "warning" ? AlertTriangle : Info;
  const iconClass = tone === "warning" ? "text-[var(--color-status-error)]" : "text-[var(--color-action-primary)]";
  const confirmClass = tone === "warning"
    ? "bg-[var(--color-status-error)] text-white hover:brightness-95"
    : "bg-[var(--color-action-primary)] text-[var(--color-action-on-primary)] hover:bg-[var(--color-action-hover)]";

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in sm:items-center sm:p-6">
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="marketing-dialog-title"
        aria-describedby="marketing-dialog-description"
        className="w-full max-w-md rounded-t-[var(--radius-card)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] motion-safe:animate-in motion-safe:slide-in-from-bottom-4 sm:rounded-[var(--radius-card)] sm:p-6"
      >
        <div className="flex items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-subtle)] ${iconClass}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="marketing-dialog-title" className="text-lg font-bold text-[var(--color-text-primary)]">{title}</h2>
            <p id="marketing-dialog-description" className="mt-1.5 text-sm leading-6 text-[var(--color-text-secondary)]">{description}</p>
          </div>
          <button type="button" onClick={onCancel} disabled={busy} aria-label="Close dialog" className="-mr-2 -mt-2 flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-50">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} disabled={busy} className="min-h-11 rounded-[var(--radius-control)] border border-[var(--color-border-control)] px-4 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-50">Keep it</button>
          <button type="button" onClick={onConfirm} disabled={busy} className={`min-h-11 rounded-[var(--radius-control)] px-4 text-sm font-bold disabled:opacity-50 ${confirmClass}`}>{busy ? "Working…" : confirmLabel}</button>
        </div>
      </section>
    </div>
  );
}
