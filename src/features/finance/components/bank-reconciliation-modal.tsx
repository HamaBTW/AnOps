"use client";
import { ModalPortal } from "@/shared/components/ui/modal-portal";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  matchBankStatementTransactionsAction,
  reconcileBankBatchAction,
  type MatchedBankTransaction,
} from "@/features/finance/actions/finance-ai.actions";
import { Button } from "@/shared/components/ui/button";

export function BankReconciliationModal({
  openInvoicesCount = 0,
}: {
  openInvoicesCount?: number;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [statementText, setStatementText] = useState("");
  const [analyzing, startAnalyzing] = useTransition();
  const [applying, startApplying] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [matches, setMatches] = useState<MatchedBankTransaction[]>([]);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  const sampleStatement = `2026-10-28 VIR SEPA Denshi Tech INV-2026-00001 119000.00 TND
2026-10-29 PRVL STE TECHSOLUTIONS REF 00002 540.00 TND
2026-10-30 CHEQUE 994821 oussema issaoui 12000.00 TND`;

  function handleLoadSample() {
    setStatementText(sampleStatement);
  }

  function handleAnalyze() {
    if (!statementText.trim()) {
      setError("Please paste or type bank statement entries first.");
      return;
    }
    setError(null);
    setSuccessMsg(null);

    startAnalyzing(async () => {
      const res = await matchBankStatementTransactionsAction(statementText);
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.data?.transactions) {
        setMatches(res.data.transactions);
        // Pre-select matches that have high or medium confidence
        const initialSelected: Record<string, boolean> = {};
        for (const tx of res.data.transactions) {
          if (tx.matchedInvoiceId) {
            initialSelected[tx.id] = true;
          }
        }
        setSelectedIds(initialSelected);
      }
    });
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  function toggleSelectAll() {
    const allSelected = matches.length > 0 && matches.every((m) => selectedIds[m.id]);
    const next: Record<string, boolean> = {};
    if (!allSelected) {
      for (const m of matches) next[m.id] = true;
    }
    setSelectedIds(next);
  }

  function handleApplyReconcile() {
    const toReconcile = matches.filter((m) => selectedIds[m.id]);
    if (toReconcile.length === 0) {
      setError("Please select at least one transaction to reconcile.");
      return;
    }

    setError(null);
    startApplying(async () => {
      const res = await reconcileBankBatchAction({
        transactions: toReconcile.map((t) => ({
          date: t.date,
          amount: t.amount,
          currency: t.currency,
          method: t.method,
          reference: t.reference || t.rawDescription,
          matchedInvoiceId: t.matchedInvoiceId,
        })),
      });

      if (res.error) {
        setError(res.error);
        return;
      }

      setSuccessMsg(
        `Successfully reconciled ${res.data?.reconciledCount} payment(s) and settled ${res.data?.allocatedCount} invoice(s)!`
      );
      setMatches([]);
      setSelectedIds({});
      setStatementText("");
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setError(null);
          setSuccessMsg(null);
        }}
        className="inline-flex min-h-[40px] items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-[var(--radius-control)] border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 shadow-sm transition-all"
      >
        <span className="text-sm">✨</span> AI Bank Matcher
      </button>

      {isOpen && (
        <ModalPortal><div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[var(--radius-card)] bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] p-6 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[var(--color-border-subtle)] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">✨</span>
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                    AI Bank Statement Reconciliation
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    Smart Matcher
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  Paste bank statement lines or wire memos. AI will cross-reference debtor names, invoice numbers, and balances against {openInvoicesCount} open invoice(s).
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

            {/* Error & Success Messages */}
            {error && (
              <div className="p-3 text-xs rounded-[var(--radius-control)] bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="p-3 text-xs rounded-[var(--radius-control)] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                {successMsg}
              </div>
            )}

            {/* Input Section */}
            {matches.length === 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[var(--color-text-secondary)]">
                    Raw Bank Statement Lines (paste CSV or plain text)
                  </label>
                  <button
                    type="button"
                    onClick={handleLoadSample}
                    className="text-xs text-[var(--color-action-primary)] hover:underline"
                  >
                    Load sample entries
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={statementText}
                  onChange={(e) => setStatementText(e.target.value)}
                  placeholder="Paste bank transaction export here... e.g.&#10;2026-10-28 VIR SEPA Denshi Tech INV-2026-00001 119000.00 TND&#10;2026-10-29 PRVL STE TECHSOLUTIONS REF 00002 540.00 TND"
                  className="w-full font-mono text-xs p-3 rounded-[var(--radius-control)] bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-action-primary)]"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setIsOpen(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAnalyze}
                    disabled={analyzing || !statementText.trim()}
                    className="text-xs"
                  >
                    {analyzing ? "AI Analyzing Transactions..." : "✨ Run AI Matcher"}
                  </Button>
                </div>
              </div>
            )}

            {/* Match Results Table */}
            {matches.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-[var(--color-bg-subtle)] p-3 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)]">
                  <div className="text-xs text-[var(--color-text-secondary)]">
                    Identified <strong className="text-[var(--color-text-primary)]">{matches.length}</strong> transactions •{" "}
                    <strong className="text-emerald-500">
                      {matches.filter((m) => m.matchedInvoiceId).length}
                    </strong>{" "}
                    matched to unpaid invoices
                  </div>
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-xs text-[var(--color-action-primary)] hover:underline"
                  >
                    {matches.every((m) => selectedIds[m.id]) ? "Deselect All" : "Select All"}
                  </button>
                </div>

                <div className="overflow-x-auto rounded-[var(--radius-control)] border border-[var(--color-border-subtle)]">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[var(--color-bg-subtle)]/70 text-[var(--color-text-secondary)]">
                      <tr className="border-b border-[var(--color-border-subtle)]">
                        <th className="py-2.5 px-3 w-8"></th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Statement Description</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                        <th className="py-2.5 px-3">Matched Invoice</th>
                        <th className="py-2.5 px-3">Match Confidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border-subtle)]">
                      {matches.map((tx) => (
                        <tr
                          key={tx.id}
                          className={`hover:bg-[var(--color-bg-subtle)]/40 transition-colors ${
                            selectedIds[tx.id] ? "bg-emerald-500/5" : ""
                          }`}
                        >
                          <td className="py-2.5 px-3">
                            <input
                              type="checkbox"
                              checked={!!selectedIds[tx.id]}
                              onChange={() => toggleSelect(tx.id)}
                              className="rounded border-[var(--color-border-subtle)] text-emerald-600 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[var(--color-text-secondary)] whitespace-nowrap">
                            {tx.date}
                          </td>
                          <td className="py-2.5 px-3 max-w-xs truncate text-[var(--color-text-primary)] font-medium">
                            {tx.rawDescription}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-[var(--color-text-primary)] whitespace-nowrap">
                            {new Intl.NumberFormat("fr-TN", {
                              style: "currency",
                              currency: tx.currency || "TND",
                            }).format(tx.amount)}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {tx.matchedInvoiceNumber ? (
                              <div className="space-y-0.5">
                                <span className="font-semibold text-[var(--color-text-primary)]">
                                  {tx.matchedInvoiceNumber}
                                </span>
                                <div className="text-[10px] text-[var(--color-text-secondary)]">
                                  {tx.matchedCustomerName}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[var(--color-text-tertiary)] italic">
                                Unallocated
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex flex-col gap-0.5">
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold w-fit ${
                                  tx.confidence === "high"
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                    : tx.confidence === "medium"
                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                    : "bg-slate-500/10 text-slate-500 border border-slate-500/20"
                                }`}
                              >
                                {tx.confidence === "high"
                                  ? `✓ Match (${tx.confidenceScore}%)`
                                  : tx.confidence === "medium"
                                  ? `~ Possible (${tx.confidenceScore}%)`
                                  : "No Match"}
                              </span>
                              <span className="text-[10px] text-[var(--color-text-secondary)] truncate max-w-[200px]" title={tx.matchReasoning}>
                                {tx.matchReasoning}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Actions Bar */}
                <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border-subtle)]">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setMatches([]);
                      setSelectedIds({});
                    }}
                    className="text-xs"
                  >
                    ← Back to Input
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => setIsOpen(false)}
                      className="text-xs"
                    >
                      Close
                    </Button>
                    <Button
                      onClick={handleApplyReconcile}
                      disabled={applying || Object.values(selectedIds).filter(Boolean).length === 0}
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {applying
                        ? "Recording Payments & Invoices..."
                        : `Reconcile Selected (${Object.values(selectedIds).filter(Boolean).length})`}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </ModalPortal>
      )}
    </>
  
  );
}
