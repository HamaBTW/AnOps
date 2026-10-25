"use client";

import { useState } from "react";
import { scanReceiptAction } from "@/features/finance/actions/receipt-ocr.actions";

export default function FinanceReceiptsPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);
    const res = await scanReceiptAction(formData);
    if (res?.error) setError(res.error);
    if (res?.success) setSuccess("Receipt uploaded and scanned (proposed extraction saved).");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Receipt OCR</h1>
        <p className="text-sm text-muted-foreground">Upload receipts for AI extraction (review before applying)</p>
      </div>
      <div className="p-4 bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-[var(--radius-control)] space-y-4">
        <form action={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input type="file" name="receipt" accept="image/*,application/pdf" required className="text-sm text-[var(--color-text-primary)]" />
          <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">Scan Receipt</button>
        </form>
        {error && <div className="text-sm text-red-600">{error}</div>}
        {success && <div className="text-sm text-green-600">{success}</div>}
        <div className="text-xs text-[var(--color-text-secondary)]">Extraction is proposed only. Nothing is auto-posted.</div>
      </div>
    </div>
  );
}
