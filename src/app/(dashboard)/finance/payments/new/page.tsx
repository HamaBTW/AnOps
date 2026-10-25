"use client";

import { useState } from "react";
import { recordPaymentAction } from "@/features/finance/actions/finance.actions";

export default function NewPaymentPage() {
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setError(null);
    const res = await recordPaymentAction(formData);
    if (res?.error) setError(res.error);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Record Payment</h1>
        <p className="text-sm text-muted-foreground">Record incoming payment</p>
      </div>
      <form action={onSubmit} className="p-4 bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-[var(--radius-control)] space-y-4 max-w-2xl">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm text-[var(--color-text-secondary)]">Payment Date</label>
            <input type="date" name="paymentDate" required className="w-full border border-[var(--color-border-subtle)] rounded-[var(--radius-control)] px-3 py-2 text-sm bg-transparent text-[var(--color-text-primary)]" />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-[var(--color-text-secondary)]">Amount</label>
            <input type="number" step="0.01" name="amount" required className="w-full border border-[var(--color-border-subtle)] rounded-[var(--radius-control)] px-3 py-2 text-sm bg-transparent text-[var(--color-text-primary)]" />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-[var(--color-text-secondary)]">Method</label>
            <select name="method" className="w-full border border-[var(--color-border-subtle)] rounded-[var(--radius-control)] px-3 py-2 text-sm bg-transparent text-[var(--color-text-primary)]">
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="cheque">Cheque</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm text-[var(--color-text-secondary)]">Currency</label>
            <select name="currency" className="w-full border border-[var(--color-border-subtle)] rounded-[var(--radius-control)] px-3 py-2 text-sm bg-transparent text-[var(--color-text-primary)]">
              <option value="TND">TND</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-sm text-[var(--color-text-secondary)]">Reference</label>
            <input name="reference" className="w-full border border-[var(--color-border-subtle)] rounded-[var(--radius-control)] px-3 py-2 text-sm bg-transparent text-[var(--color-text-primary)]" />
          </div>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">Record Payment</button>
      </form>
    </div>
  );
}
