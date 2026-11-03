"use client";

import { useState, useTransition } from "react";
import {
  generateFinancialBriefingAction,
  type FinancialBriefingResult,
} from "@/features/finance/actions/finance-ai.actions";
import { Button } from "@/shared/components/ui/button";
import { FormMessage } from "@/shared/components/ui/form-message";

export function FinancialBriefingModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [briefing, setBriefing] = useState<FinancialBriefingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleOpen() {
    setIsOpen(true);
    if (!briefing) {
      handleGenerate();
    }
  }

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const res = await generateFinancialBriefingAction();
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.data) {
        setBriefing(res.data);
      }
    });
  }

  function handleCopy() {
    if (!briefing) return;
    const text = `AN OPS FINANCIAL EXECUTIVE BRIEFING\nGenerated: ${new Date(briefing.generatedAt).toLocaleString()}\n\nHEADLINE: ${briefing.headline}\nHEALTH SCORE: ${briefing.healthScore}/100 (${briefing.healthStatus.toUpperCase()})\n\nEXECUTIVE SUMMARY:\n${briefing.executiveSummary}\n\n30-DAY OUTLOOK:\n${briefing.projected30DayOutlook}\n\nKEY VULNERABILITIES:\n${briefing.keyVulnerabilities.map(v => "• " + v).join("\n")}\n\nACTIONABLE PRIORITIES:\n${briefing.actionablePriorities.map(p => "✓ " + p).join("\n")}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-[var(--radius-control)] border border-[var(--color-action-primary)]/50 bg-[var(--color-action-primary)]/10 text-[var(--color-text-primary)] hover:bg-[var(--color-action-primary)]/20 transition-all shadow-xs"
      >
        <span>✨</span>
        <span>AI Financial Brief</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs print:hidden animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-6 shadow-2xl space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📊</span>
                <div>
                  <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                    Executive Financial Health & Cash Flow Brief
                  </h3>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Real-time AI analysis of balance velocity, aging risk, and 30-day liquidity outlook
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-xl p-1"
              >
                ✕
              </button>
            </div>

            {pending && (
              <div className="py-16 text-center space-y-3">
                <div className="inline-block animate-spin text-3xl">⚙️</div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Synthesizing real-time financial ledger & aging metrics...
                </p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Forecasting working capital runway and evaluating collection efficiency.
                </p>
              </div>
            )}

            {error && <FormMessage kind="error">{error}</FormMessage>}

            {briefing && !pending && (
              <div className="space-y-5 animate-in fade-in duration-300">
                {/* Health Score & Status Badge */}
                <div
                  className={`p-4 rounded-lg border flex items-center justify-between ${
                    briefing.healthStatus === "excellent" || briefing.healthStatus === "healthy"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                      : briefing.healthStatus === "caution"
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300"
                  }`}
                >
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                      Liquidity Health Index
                    </span>
                    <span className="text-lg font-bold">
                      {briefing.healthStatus === "excellent" && "🟢 Excellent Liquidity Runway"}
                      {briefing.healthStatus === "healthy" && "🟢 Healthy Financial Operations"}
                      {briefing.healthStatus === "caution" && "🟡 Moderate Cash Flow Pressure"}
                      {briefing.healthStatus === "critical" && "🔴 Critical Liquidity Alert"}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold block opacity-80">Health Score</span>
                    <span className="text-3xl font-black">{briefing.healthScore}/100</span>
                  </div>
                </div>

                {/* Headline Banner */}
                <div className="p-3 rounded-lg bg-[var(--color-bg-subtle)]/60 border border-[var(--color-border-subtle)]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] block mb-1">
                    Executive Headline
                  </span>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {briefing.headline}
                  </p>
                </div>

                {/* Executive Summary */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                    Ledger & Burn Assessment
                  </span>
                  <div className="p-3.5 rounded bg-[var(--color-bg-subtle)]/40 text-xs text-[var(--color-text-primary)] leading-relaxed whitespace-pre-line">
                    {briefing.executiveSummary}
                  </div>
                </div>

                {/* 30-Day Outlook */}
                <div className="p-3.5 rounded border border-[var(--color-action-primary)]/40 bg-[var(--color-action-primary)]/10 text-xs text-[var(--color-text-primary)] space-y-1">
                  <span className="font-bold flex items-center gap-1.5 text-xs text-[var(--color-action-on-primary)] dark:text-white">
                    <span>🔮</span> Projected 30-Day Cash Flow Outlook:
                  </span>
                  <p className="leading-relaxed">{briefing.projected30DayOutlook}</p>
                </div>

                {/* Vulnerabilities & Actionable Priorities Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Vulnerabilities */}
                  <div className="space-y-2 p-3 rounded-lg bg-[var(--color-bg-subtle)]/40 border border-[var(--color-border-subtle)]">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-status-warning)] flex items-center gap-1">
                      <span>⚠️</span> Identified Vulnerabilities
                    </span>
                    <ul className="space-y-1.5 text-xs">
                      {briefing.keyVulnerabilities.map((v, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[var(--color-text-primary)]">
                          <span className="text-[var(--color-status-warning)] font-bold">•</span>
                          <span>{v}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Priorities */}
                  <div className="space-y-2 p-3 rounded-lg bg-[var(--color-bg-subtle)]/40 border border-[var(--color-border-subtle)]">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-status-success)] flex items-center gap-1">
                      <span>✓</span> Action Priorities for This Month
                    </span>
                    <ul className="space-y-1.5 text-xs">
                      {briefing.actionablePriorities.map((p, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[var(--color-text-primary)]">
                          <span className="text-[var(--color-status-success)] font-bold">✓</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border-subtle)]">
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={handleCopy} className="text-xs">
                      {copied ? "✓ Copied to Clipboard!" : "📋 Copy Executive Summary"}
                    </Button>
                    <Button variant="secondary" onClick={handleGenerate} disabled={pending} className="text-xs">
                      🔄 Refresh Analysis
                    </Button>
                  </div>
                  <Button variant="secondary" onClick={() => setIsOpen(false)} className="text-xs">
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

