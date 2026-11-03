"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  scanReceiptAction,
  batchScanReceiptsAction,
  deleteReceiptExtractionAction,
  markReceiptReviewedAction,
  type ProposedExtraction,
  type ReceiptItemLine,
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // File selection & batch state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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
  const [items, setItems] = useState<ReceiptItemLine[]>([]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
    const first = files[0] || null;
    setSelectedFile(first);

    if (previewUrl) URL.revokeObjectURL(previewUrl);

    if (first && (first.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp)$/i.test(first.name))) {
      setPreviewUrl(URL.createObjectURL(first));
    } else {
      setPreviewUrl(null);
    }
  }

  async function handleScanSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Batch scan mode if multiple files selected
    if (selectedFiles.length > 1) {
      const formData = new FormData();
      for (const file of selectedFiles) {
        formData.append("receipts", file);
      }

      startTransition(async () => {
        const res = await batchScanReceiptsAction(formData);
        if (res.error) {
          setError(res.error);
          return;
        }

        if (res.data) {
          setSuccess(`Batch OCR Complete! Successfully scanned ${res.data.processedCount} receipt(s).`);
          setSelectedFiles([]);
          setSelectedFile(null);
          if (previewUrl) URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
          router.refresh();
        }
      });
      return;
    }

    // Single file or text mode
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
        setItems(p.items || []);
        setSuccess("Receipt scanned and verified by AI! Review extracted fields below.");
      }
    });
  }

  function handleReset() {
    setActiveExtraction(null);
    setSelectedFile(null);
    setSelectedFiles([]);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setError(null);
    setSuccess(null);
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
              Powered by Multimodal Vision AI. Upload single receipts or select multiple files for batch OCR scanning with itemized line extraction.
            </p>
          </div>
        </div>

        <form onSubmit={handleScanSubmit} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex-1 w-full">
              <input
                ref={fileInputRef}
                type="file"
                name="receipt"
                multiple
                accept="image/*,application/pdf,.txt,.csv,.json"
                onChange={handleFileChange}
                className="block w-full text-sm text-[var(--color-text-primary)] file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[var(--color-action-primary)]/10 file:text-[var(--color-action-primary)] hover:file:bg-[var(--color-action-primary)]/20 cursor-pointer border border-[var(--color-border-subtle)] rounded-[var(--radius-control)] p-1.5 bg-[var(--color-bg-subtle)]/40"
              />
            </div>
            <Button type="submit" variant="primary" disabled={pending} className="min-w-[150px]">
              {pending
                ? "AI Scanning..."
                : selectedFiles.length > 1
                ? `Scan Batch (${selectedFiles.length})`
                : "Scan with AI"}
            </Button>
          </div>

          {/* Batch Files Queue Preview */}
          {selectedFiles.length > 1 && (
            <div className="p-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)]/30 space-y-2">
              <div className="text-xs font-semibold text-[var(--color-text-primary)] flex items-center justify-between">
                <span>Batch Upload Queue ({selectedFiles.length} files)</span>
                <span className="text-[10px] text-[var(--color-text-secondary)]">Multi-receipt processing</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {selectedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-xs truncate"
                  >
                    <span className="font-medium text-[var(--color-text-primary)] block truncate">
                      {file.name}
                    </span>
                    <span className="text-[10px] text-[var(--color-text-secondary)]">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Single Image Thumbnail Preview */}
          {selectedFiles.length <= 1 && previewUrl && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)]/30">
              <img
                src={previewUrl}
                alt="Receipt Preview"
                className="h-16 w-16 object-cover rounded border border-[var(--color-border-subtle)]"
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate text-[var(--color-text-primary)]">
                  {selectedFile?.name}
                </div>
                <div className="text-xs text-[var(--color-text-secondary)]">
                  {(selectedFile?.size ? (selectedFile.size / 1024).toFixed(1) : 0)} KB · Ready for AI Vision OCR
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)] pt-1">
            <button
              type="button"
              onClick={() => setShowManualText(!showManualText)}
              className="text-[var(--color-action-primary)] hover:underline font-medium"
            >
              {showManualText ? "Hide text paste area" : "+ Paste raw text / OCR transcript manually"}
            </button>
            <span>Supports batch JPG, PNG, WEBP, PDF, TXT</span>
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
        </form>

        {error && (
          <div className="mt-4">
            <FormMessage kind="error">{error}</FormMessage>
          </div>
        )}
        {success && (
          <div className="mt-4">
            <FormMessage kind="success">{success}</FormMessage>
          </div>
        )}
      </div>

      {/* Extracted Review Card */}
      {activeExtraction && (
        <div className="rounded-[var(--radius-card)] border-2 border-[var(--color-action-primary)]/40 bg-[var(--color-bg-surface)] p-6 shadow-md space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--color-border-subtle)] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg">✨</span>
                <h3 className="font-semibold text-lg text-[var(--color-text-primary)]">
                  AI Extraction Verified
                </h3>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  {Math.round((activeExtraction.proposed.confidence || 0.85) * 100)}% Confidence
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                Review the parsed receipt data and itemized lines below before creating an expense.
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button variant="secondary" onClick={handleReset} className="text-xs">
                Discard
              </Button>
              <Button
                variant="primary"
                onClick={handleConvertToExpense}
                className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                + Convert to Expense Claim
              </Button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Visual Thumbnail */}
            <div className="space-y-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Document Preview
              </label>
              {previewUrl ? (
                <div className="rounded-lg border border-[var(--color-border-subtle)] overflow-hidden bg-black/5 dark:bg-black/20 flex items-center justify-center p-2 max-h-72">
                  <img
                    src={previewUrl}
                    alt="Receipt visual"
                    className="max-h-64 object-contain rounded shadow-sm"
                  />
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-[var(--color-border-subtle)] p-8 text-center text-xs text-[var(--color-text-secondary)] space-y-2">
                  <IconDocument size={32} className="mx-auto opacity-40" />
                  <div>Document parsed from text or PDF attachment</div>
                </div>
              )}
            </div>

            {/* Editable Fields */}
            <div className="space-y-4">
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

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[var(--color-text-secondary)]">Subtotal (HT)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={selectClass}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[var(--color-text-secondary)]">Tax / VAT</label>
                  <input
                    type="number"
                    step="0.001"
                    value={tax}
                    onChange={(e) => setTax(e.target.value)}
                    className={selectClass}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[var(--color-text-secondary)]">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className={selectClass}
                  >
                    <option value="TND">TND</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Itemized Lines Table */}
          {items.length > 0 && (
            <div className="space-y-2 pt-3 border-t border-[var(--color-border-subtle)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                  Itemized Line Breakdown ({items.length} item{items.length > 1 ? "s" : ""})
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  ✨ Extracted by Vision AI
                </span>
              </div>
              <div className="overflow-x-auto rounded border border-[var(--color-border-subtle)]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]">
                    <tr>
                      <th className="py-2 px-3">Item Description</th>
                      <th className="py-2 px-3 text-right w-16">Qty</th>
                      <th className="py-2 px-3 text-right w-24">Unit Price</th>
                      <th className="py-2 px-3 text-right w-24">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border-subtle)]">
                    {items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-[var(--color-bg-subtle)]/40">
                        <td className="py-1.5 px-3 font-medium text-[var(--color-text-primary)]">
                          {it.description}
                        </td>
                        <td className="py-1.5 px-3 text-right text-[var(--color-text-secondary)]">
                          {it.quantity}
                        </td>
                        <td className="py-1.5 px-3 text-right text-[var(--color-text-secondary)] font-mono">
                          {it.unitPrice.toFixed(3)}
                        </td>
                        <td className="py-1.5 px-3 text-right font-semibold text-[var(--color-text-primary)] font-mono">
                          {it.total.toFixed(3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)]/50 text-[var(--color-text-secondary)] text-xs font-medium">
                  <th className="py-3 px-4">Uploaded File</th>
                  <th className="py-3 px-4">Merchant / Vendor</th>
                  <th className="py-3 px-4">Receipt Date</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Extracted Total</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)]">
                {initialReceipts.map((item) => {
                  const p = item.proposed || {};
                  return (
                    <tr key={item.id} className="hover:bg-[var(--color-bg-subtle)]/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-[var(--color-text-primary)] text-xs truncate max-w-[180px]">
                          {item.originalName}
                        </div>
                        <div className="text-[10px] text-[var(--color-text-secondary)]">
                          {(item.size / 1024).toFixed(1)} KB · {item.createdAt.slice(0, 10)}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-[var(--color-text-primary)] text-xs">
                        {p.vendor || <span className="text-[var(--color-text-secondary)] italic">Unknown</span>}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-[var(--color-text-secondary)]">
                        {p.date || "—"}
                      </td>
                      <td className="py-3 px-4 text-xs text-[var(--color-text-secondary)]">
                        {p.categoryHint ? (
                          <span className="px-2 py-0.5 rounded bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] text-[11px]">
                            {p.categoryHint}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-xs font-bold text-[var(--color-text-primary)]">
                        {p.total != null ? (
                          new Intl.NumberFormat("fr-TN", {
                            style: "currency",
                            currency: p.currency || "TND",
                          }).format(p.total)
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {item.reviewed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <IconCheck size={10} /> Converted
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            Pending Review
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleConvertFromHistory(item)}
                            className="text-xs font-medium text-[var(--color-action-primary)] hover:underline px-2 py-1 rounded hover:bg-[var(--color-action-primary)]/10"
                            title="Convert into Expense Claim"
                          >
                            + Expense
                          </button>
                          {!item.reviewed && (
                            <button
                              type="button"
                              onClick={() => handleMarkReviewed(item.id)}
                              className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] px-2 py-1 rounded hover:bg-[var(--color-bg-subtle)]"
                              title="Mark as reviewed"
                            >
                              Dismiss
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="text-xs text-[var(--color-status-error)] hover:opacity-80 px-2 py-1 rounded hover:bg-[var(--color-status-error-bg)]"
                            title="Delete extraction"
                          >
                            Delete
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