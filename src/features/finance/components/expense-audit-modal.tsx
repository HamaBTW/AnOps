"use client";

import { useState, useEffect, useTransition } from "react";
import {
  auditExpenseAction,
  type ExpenseAuditResult,
} from "@/features/finance/actions/finance-ai.actions";
import { Button } from "@/shared/components/ui/button";
import { FormMessage } from "@/shared/components/ui/form-message";

export function ExpenseAuditModal({
  isOpen,
  onClose,
  expenseId,
  vendor,
  amount,
  currency,
  onApprove,
  canApprove,
}: {
  isOpen: boolean;
  onClose: () => void;
  expenseId: string;
  vendor?: string;
  amount: number;
  currency: string;
  onApprove?: (id: string) => void;
  canApprove?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [audit, setAudit] = useState<ExpenseAuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !expenseId) {
      setAudit(null);
      setError(null);
      return;
    }

    startTransition(async () => {
      setError(null);
      const res = await auditExpenseAction(expenseId);
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.data) {
        setAudit(res.data);
      }
    });
  }, [isOpen, expenseId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs print:hidden animate-in fade-in duration-200">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-6 shadow-2xl space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛡️</span>
            <div>
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                AI Expense Policy & Duplicate Audit
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {vendor || "Expense"} · {amount.toLocaleString(undefined, { minimumFractionDigits: 3 })} {currency}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-xl p-1"
          >
            ✕
          </button>
        </div>

        {pending && (
          <div className="py-12 text-center space-y-3">
            <div className="inline-block animate-spin text-2xl">⚙️</div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">
              Auditing against policy rules & scanning for duplicates...
            </p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Analyzing category norms, weekend schedules, and recent company claims.
            </p>
          </div>
        )}

        {error && <FormMessage kind="error">{error}</FormMessage>}

        {audit && !pending && (
          <div className="space-y-4">
            {/* Risk & Status Banner */}
            <div
              className={`p-4 rounded-lg border flex items-center justify-between ${
                audit.status === "pass"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                  : audit.status === "warning"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300"
              }`}
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                  Audit Verdict
                </span>
                <span className="text-base font-bold capitalize">
                  {audit.status === "pass" && "✓ Policy Compliant"}
                  {audit.status === "warning" && "⚠️ Caution / Minor Discrepancy"}
                  {audit.status === "flagged" && "🚨 High Risk / Policy Flagged"}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold block opacity-80">Risk Score</span>
                <span className="text-xl font-black">{audit.riskScore}/100</span>
              </div>
            </div>

            {/* Summary */}
            <div className="p-3 rounded bg-[var(--color-bg-subtle)]/50 text-xs text-[var(--color-text-primary)] leading-relaxed">
              <span className="font-semibold block mb-1">Auditor Assessment:</span>
              {audit.summary}
            </div>

            {/* Duplicate Candidate Warning */}
            {audit.isDuplicateRisk && audit.duplicateCandidate && (
              <div className="p-3 rounded border border-rose-500/30 bg-rose-500/5 text-xs text-rose-800 dark:text-rose-300 space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <span>⚠️</span> Potential Duplicate Found:
                </span>
                <p>
                  Similar claim on record:{" "}
                  <strong>{audit.duplicateCandidate.vendor}</strong> for{" "}
                  <strong>{audit.duplicateCandidate.amount}</strong> on{" "}
                  <strong>{audit.duplicateCandidate.date}</strong>.
                </p>
              </div>
            )}

            {/* Policy Flags */}
            {audit.policyFlags && audit.policyFlags.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Detected Policy Points
                </span>
                <ul className="space-y-1 text-xs">
                  {audit.policyFlags.map((flag, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-1.5 text-[var(--color-status-warning)]"
                    >
                      <span>•</span>
                      <span>{flag}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {audit.recommendations && audit.recommendations.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-[var(--color-border-subtle)]">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Approver Recommendations
                </span>
                <ul className="space-y-1 text-xs">
                  {audit.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 text-[var(--color-text-primary)]">
                      <span>✓</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border-subtle)]">
              <Button variant="secondary" onClick={onClose} className="text-xs">
                Close
              </Button>
              {canApprove && onApprove && (
                <Button
                  variant={audit.status === "flagged" ? "danger" : "primary"}
                  onClick={() => {
                    onApprove(expenseId);
                    onClose();
                  }}
                  className="text-xs"
                >
                  {audit.status === "flagged" ? "Override & Approve Anyway" : "Approve Expense Claim"}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

