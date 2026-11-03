"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  analyzeCustomerCreditRiskAction,
  type CustomerCreditRiskResult,
} from "@/features/finance/actions/finance-ai.actions";
import { Button } from "@/shared/components/ui/button";

export function CustomerCreditRiskModal({
  customerId,
  customerName,
}: {
  customerId: string;
  customerName: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [risk, setRisk] = useState<CustomerCreditRiskResult | null>(null);

  function handleOpen() {
    setIsOpen(true);
    setError(null);
    if (!risk) {
      startTransition(async () => {
        const res = await analyzeCustomerCreditRiskAction(customerId);
        if (res.error) {
          setError(res.error);
          return;
        }
        if (res.data) {
          setRisk(res.data);
        }
      });
    }
  }

  const fmt = (n: number, c = "TND") =>
    new Intl.NumberFormat("fr-TN", { style: "currency", currency: c }).format(n || 0);

  function getRatingColor(rating: string) {
    if (["AAA", "AA", "A"].includes(rating)) {
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
    }
    if (["BBB", "BB", "B"].includes(rating)) {
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
    }
    return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30";
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:underline font-medium px-2 py-1 rounded hover:bg-amber-500/10 transition-colors"
        title="Analyze AI Credit Score & Risk Profile"
      >
        <span>⚡</span> Credit Score
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[var(--radius-card)] bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] p-6 shadow-2xl space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[var(--color-border-subtle)] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">⚡</span>
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                    AI Credit Underwriting & Risk Analysis
                  </h3>
                </div>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  Debtor profile for <strong className="text-[var(--color-text-primary)]">{customerName}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-lg p-1"
              >
                ✕
              </button>
            </div>

            {loading && (
              <div className="py-12 text-center space-y-3">
                <div className="animate-spin text-3xl">⏳</div>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Evaluating historical payment velocity, delinquency rates, and risk models...
                </p>
              </div>
            )}

            {error && (
              <div className="p-3 text-xs rounded-[var(--radius-control)] bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
                {error}
              </div>
            )}

            {risk && !loading && (
              <div className="space-y-4">
                {/* Score & Rating Top Card */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="p-3.5 rounded-[var(--radius-control)] bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] space-y-1">
                    <span className="text-[11px] font-medium text-[var(--color-text-secondary)] uppercase">
                      Credit Rating
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 text-base font-bold rounded border ${getRatingColor(
                          risk.rating
                        )}`}
                      >
                        {risk.rating}
                      </span>
                      <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                        {risk.score}/100
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-[var(--radius-control)] bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] space-y-1">
                    <span className="text-[11px] font-medium text-[var(--color-text-secondary)] uppercase">
                      Recommended Terms
                    </span>
                    <div className="text-sm font-bold text-[var(--color-text-primary)]">
                      {risk.recommendedPaymentTerms}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-[var(--radius-control)] bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] space-y-1">
                    <span className="text-[11px] font-medium text-[var(--color-text-secondary)] uppercase">
                      Credit Ceiling
                    </span>
                    <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {fmt(risk.recommendedCreditLimit, risk.currency)}
                    </div>
                  </div>
                </div>

                {/* Executive Summary */}
                <div className="p-3.5 rounded-[var(--radius-control)] bg-[var(--color-bg-subtle)]/60 border border-[var(--color-border-subtle)] space-y-1.5">
                  <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                    Debtor Reliability Assessment
                  </span>
                  <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                    {risk.summary}
                  </p>
                </div>

                {/* Ledger Historical Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2.5 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)]">
                    <div className="text-[10px] text-[var(--color-text-secondary)]">Historical Total</div>
                    <div className="text-xs font-bold text-[var(--color-text-primary)] mt-0.5">
                      {fmt(risk.historicalMetrics.totalInvoiced, risk.currency)}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)]">
                    <div className="text-[10px] text-[var(--color-text-secondary)]">Total Settled</div>
                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {fmt(risk.historicalMetrics.totalPaid, risk.currency)} ({risk.historicalMetrics.collectionRatePercent}%)
                    </div>
                  </div>
                  <div className="p-2.5 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)]">
                    <div className="text-[10px] text-[var(--color-text-secondary)]">Outstanding</div>
                    <div className="text-xs font-bold text-[var(--color-text-primary)] mt-0.5">
                      {fmt(risk.historicalMetrics.totalOutstanding, risk.currency)}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)]">
                    <div className="text-[10px] text-[var(--color-text-secondary)]">Overdue Debt</div>
                    <div
                      className={`text-xs font-bold mt-0.5 ${
                        risk.historicalMetrics.totalOverdue > 0
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-[var(--color-text-secondary)]"
                      }`}
                    >
                      {fmt(risk.historicalMetrics.totalOverdue, risk.currency)}
                    </div>
                  </div>
                </div>

                {/* Key Underwriting Factors */}
                {risk.keyFactors && risk.keyFactors.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                      Key Underwriting Factors:
                    </span>
                    <ul className="space-y-1 text-xs text-[var(--color-text-secondary)] list-disc pl-4">
                      {risk.keyFactors.map((factor, idx) => (
                        <li key={idx}>{factor}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommended Action Pill */}
                {risk.recommendedAction && (
                  <div className="p-3 text-xs rounded-[var(--radius-control)] bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 flex items-center justify-between">
                    <span>💡 <strong>Recommendation:</strong> {risk.recommendedAction}</span>
                  </div>
                )}

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border-subtle)]">
                  <Button variant="secondary" onClick={() => setIsOpen(false)} className="text-xs">
                    Close
                  </Button>
                  <Link
                    href={`/finance/invoices/new?customerId=${customerId}`}
                    className="px-3.5 py-2 text-xs font-semibold rounded-[var(--radius-control)] bg-[var(--color-action-primary)] text-white hover:opacity-90 shadow-sm"
                  >
                    + Create Invoice for {customerName}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
