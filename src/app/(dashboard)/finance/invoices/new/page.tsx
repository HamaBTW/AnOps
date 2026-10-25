"use client";

import { useState } from "react";
import { createInvoiceDraftAction } from "@/features/finance/actions/finance.actions";

export default function NewInvoicePage() {
  const [customers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setError(null);
    const res = await createInvoiceDraftAction(formData);
    if (res?.error) setError(res.error);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Invoice</h1>
        <p className="text-sm text-muted-foreground">Create a draft invoice</p>
      </div>
      <form action={onSubmit} className="p-4 bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-[var(--radius-control)] space-y-4 max-w-2xl">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm text-[var(--color-text-secondary)]">Customer</label>
            <input name="customerId" required className="w-full border border-[var(--color-border-subtle)] rounded-[var(--radius-control)] px-3 py-2 text-sm bg-transparent text-[var(--color-text-primary)]" placeholder="Customer ID" />
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
          <div className="space-y-1">
            <label className="text-sm text-[var(--color-text-secondary)]">Issue Date</label>
            <input type="date" name="issueDate" required className="w-full border border-[var(--color-border-subtle)] rounded-[var(--radius-control)] px-3 py-2 text-sm bg-transparent text-[var(--color-text-primary)]" />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-[var(--color-text-secondary)]">Due Date</label>
            <input type="date" name="dueDate" className="w-full border border-[var(--color-border-subtle)] rounded-[var(--radius-control)] px-3 py-2 text-sm bg-transparent text-[var(--color-text-primary)]" />
          </div>
        </div>
        <input type="hidden" name="lines" value={JSON.stringify([{ description: "Service", quantity: 1, unitPrice: 0, taxRate: 0 }])} />
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">Create Draft</button>
      </form>
    </div>
  );
}
