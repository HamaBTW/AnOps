"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  scanReceiptAction,
  deleteReceiptExtractionAction,
  markReceiptReviewedAction,
  type ProposedExtraction,
} from "@/features/finance/actions/receipt-ocr.actions";
import { Button, selectClass, textareaClass } from "@/shared/components/ui/button";
import { TextField } from "@/shared/components/ui/text-field";
import { FormMessage } from "@/shared/components/ui/form-message";
import { IconPackage, IconDocument, IconCheck } from "@/shared/components/ui/brand-icons";

type ReceiptItem = {
  id: string;
  receiptDocumentId: string;
  originalName: string;
  mimeType: string;
  size: number;
  proposed: ProposedExtraction;
  rawText: string;
  reviewed: boolean;
  createdAt: string;
};

export function ReceiptScanner({ initialReceipts = [] }: { initialReceipts?: ReceiptItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Scan state
  const [activeExtraction, setActiveExtraction] = useState<{
    receiptDocumentId: string;
    extractionId: string;
    proposed: ProposedExtraction;
  } | null>(null);

  // Manual text mode toggle
  const [showManualText, setShowManualText] = useState(false);
  const [manualText, setManualText] = useState("");
  const [manualNotes, setManualNotes] = useState("");

  // Editable fields for active review
  const [vendor, setVendor] = useState("");
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState<number | string>("");
  const [tax, setTax] = useState<number | string>("");
  const [currency, setCurrency] = useState("TND");
  const [categoryHint, setCategoryHint] = useState("");

  async function handleScanSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    if (manualText.trim()) formData.set("receiptText", manualText.trim());
    if (manualNotes.trim()) formData.set("notes", manualNotes.trim());

    startTransition(async () => {
      const res = await scanReceiptAction(formData);
      if (res.error) {
        setError(res.error);
        return;
      }

      if (res.data) {
        const p = res.data.proposed || {};
        setActiveExtraction(res.data);
        setVendor(p.vendor || "");
        setDate(p.date || new Date().toISOString().slice(0, 10));
        setAmount(p.amount ?? p.total ?? "");
        setTax(p.tax ?? 0);
        setCurrency(p.currency || "TND");
        setCategoryHint(p.categoryHint || "");
        setSuccess("Receipt scanned successfully! Review the extracted fields below.");
      }
    });
  }

  function handleConvertToExpense() {
    if (!activeExtraction) return;
    const query = new URLSearchParams();
    if (vendor) query.set("vendor", vendor);
    if (amount) query.set("amount", String(amount));
    if (tax) query.set("tax", String(tax));
    if (date) query.set("date", date);
    if (currency) query.set("currency", currency);
    if (categoryHint) query.set("categoryHint", categoryHint);
    if (activeExtraction.receiptDocumentId) {
      query.set("receiptDocumentId", activeExtraction.receiptDocumentId);
    }

    // Mark as reviewed
    markReceiptReviewedAction(activeExtraction.extractionId);

    router.push(`/finance/expenses/new?${query.toString()}`);
  }

  function handleConvertFromHistory(item: ReceiptItem) {
    const p = item.proposed || {};
    const query = new URLSearchParams();
    if (p.vendor) query.set("vendor", p.vendor);
    if (p.amount ?? p.total) query.set("amount", String(p.amount ?? p.total));
    if (p.tax) query.set("tax", String(p.tax));
    if (p.date) query.set("date", p.date);
    if (p.currency) query.set("currency", p.currency);
    if (p.categoryHint) query.set("categoryHint", p.categoryHint);
    if (item.receiptDocumentId) query.set("receiptDocumentId", item.receiptDocumentId);

    markReceiptReviewedAction(item.id);
    router.push(`/finance/expenses/new?${query.toString()}`);
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this receipt extraction?")) return;
    startTransition(async () => {
      await deleteReceiptExtractionAction(id);
      if (activeExtraction?.extractionId === id) setActiveExtraction(null);
      router.refresh();
    });
  }

  async function handleMarkReviewed(id: string) {
    startTransition(async () => {
      await markReceiptReviewedAction(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      {/* Upload & Scan Section */}
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-[var(--color-action-primary)]/10 text-[var(--color-action-primary)]">
            <IconPackage size={22} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              AI Receipt & Invoice OCR Scanner
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Upload any vendor receipt, ticket, or PDF invoice. The AI will parse merchant, date, amounts, and tax.
            </p>
          </div>
        </div>

        <form onSubmit={handleScanSubmit} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex-1 w-full">
              <input
                type="file"
                name="receipt"
                accept="image/*,application/pdf,.txt,.csv,.json"
                className="block w-full text-sm text-[var(--color-text-primary)] file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[var(--color-action-primary)]/10 file:text-[var(--color-action-primary)] hover:file:bg-[var(--color-action-primary)]/20 cursor-pointer border border-[var(--color-border-subtle)] rounded-[var(--radius-control)] p-1.5 bg-[var(--color-bg-subtle)]/40"
              />
            </div>
            <Button type="submit" variant="primary" disabled={pending} className="min-w-[140px]">
              {pending ? "Analyzing..." : "Scan Receipt"}
            </Button>
          </div>

          <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)] pt-1">
            <button
              type="button"
              onClick={() => setShowManualText(!showManualText)}
              className="text-[var(--color-action-primary)] hover:underline font-medium"
            >
              {showManualText ? "Hide text paste area" : "+ Paste raw text / OCR transcript manually"}
            </button>
            <span>Supports JPG, PNG, PDF, TXT</span>
          </div>

          {showManualText && (
            <div className="space-y-3 pt-2 border-t border-[var(--color-border-subtle)]">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">
                  Receipt Raw Text / OCR Output
                </label>
                <textarea
                  rows={3}
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="Paste receipt lines, e.g.:&#10;CARREFOUR EXPRESS&#10;Date: 2026-10-24&#10;Total: 84.500 TND&#10;TVA 19%: 13.490 TND"
                  className={textareaClass}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">
                  Optional Context Note
                </label>
                <input
                  type="text"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="e.g. Lunch with prospective client"
                  className={selectClass}
                />
              </div>
            </div>
          )}

          {error && <FormMessage kind="error">{error}</FormMessage>}
          {success && <FormMessage kind="success">{success}</FormMessage>}
        </form>
      </div>

      {/* Active Extraction Review Card */}
      {activeExtraction && (
        <div className="rounded-[var(--radius-card)] border-2 border-[var(--color-action-primary)]/40 bg-[var(--color-bg-surface)] p-6 shadow-md space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] pb-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mb-1">
                <IconCheck size={14} />
                {Math.round((activeExtraction.proposed.confidence || 0.9) * 100)}% Extraction Confidence
              </div>
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                Review Extracted Information
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Verify the values extracted by the AI before converting into an official expense claim.
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setActiveExtraction(null)}>Dismiss</Button>
              <Button variant="primary" onClick={handleConvertToExpense}>
                Convert to Expense Claim →
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <TextField
                label="Merchant / Vendor"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="Merchant name"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-[var(--color-text-secondary)]">Receipt Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={selectClass}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-[var(--color-text-secondary)]">Suggested Category</label>
              <select
                value={categoryHint}
                onChange={(e) => setCategoryHint(e.target.value)}
                className={selectClass}
              >
                <option value="">-- General Expense --</option>
                <option value="Office Supplies">Office Supplies</option>
                <option value="Meals & Entertainment">Meals & Entertainment</option>
                <option value="Travel & Lodging">Travel & Lodging</option>
                <option value="Utilities & Telecom">Utilities & Telecom</option>
                <option value="Software & IT">Software & IT</option>
                <option value="Marketing & Ads">Marketing & Ads</option>
                <option value="Repairs & Maintenance">Repairs & Maintenance</option>
                <option value="Professional Services">Professional Services</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-[var(--color-text-secondary)]">Net Amount</label>
              <input
                type="number"
                step="0.001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={selectClass}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-[var(--color-text-secondary)]">Tax / VAT</label>
              <input
                type="number"
                step="0.001"
                value={tax}
                onChange={(e) => setTax(e.target.value)}
                className={selectClass}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-[var(--color-text-secondary)]">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className={selectClass}
              >
                <option value="TND">TND (Tunisian Dinar)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Receipts History Table */}
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-[var(--color-text-primary)]">Scanned Receipts History</h3>
            <p className="text-xs text-[var(--color-text-secondary)]">
              All OCR extractions saved for review and audit trails
            </p>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]">
            {initialReceipts.length} documents
          </span>
        </div>

        {initialReceipts.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--color-text-secondary)]">
            No receipts scanned yet. Upload your first receipt above to preview AI extraction!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--color-bg-subtle)]/60 text-[var(--color-text-secondary)] border-b border-[var(--color-border-subtle)]">
                <tr>
                  <th className="p-3 font-medium">Document</th>
                  <th className="p-3 font-medium">Merchant</th>
                  <th className="p-3 font-medium">Receipt Date</th>
                  <th className="p-3 font-medium">Total</th>
                  <th className="p-3 font-medium">Category</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)]">
                {initialReceipts.map((r) => {
                  const p = r.proposed || {};
                  const totalVal = p.total ?? p.amount ?? 0;
                  return (
                    <tr key={r.id} className="hover:bg-[var(--color-bg-subtle)]/30 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <IconDocument size={16} className="text-[var(--color-text-secondary)] shrink-0" />
                          <div className="truncate max-w-[160px] font-medium text-[var(--color-text-primary)]" title={r.originalName}>
                            {r.originalName}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-medium text-[var(--color-text-primary)]">
                        {p.vendor || "—"}
                      </td>
                      <td className="p-3 text-[var(--color-text-secondary)]">
                        {p.date || "—"}
                      </td>
                      <td className="p-3 font-semibold text-[var(--color-text-primary)]">
                        {Number(totalVal).toFixed(3)} {p.currency || "TND"}
                      </td>
                      <td className="p-3 text-[var(--color-text-secondary)]">
                        {p.categoryHint || "General"}
                      </td>
                      <td className="p-3">
                        {r.reviewed ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                            <IconCheck size={12} /> Reviewed
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                            Pending Review
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleConvertFromHistory(r)}
                            className="text-xs px-2.5 py-1 rounded bg-[var(--color-action-primary)] text-white hover:opacity-90 font-medium"
                          >
                            Convert to Expense
                          </button>
                          {!r.reviewed && (
                            <button
                              onClick={() => handleMarkReviewed(r.id)}
                              title="Mark as reviewed"
                              className="text-xs px-2 py-1 rounded border border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]"
                            >
                              ✓
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(r.id)}
                            title="Delete receipt"
                            className="p-1.5 rounded text-red-600 hover:bg-red-500/10"
                          >
                            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
