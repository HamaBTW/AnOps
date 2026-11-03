"use client";
import { ModalPortal } from "@/shared/components/ui/modal-portal";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, selectClass, textareaClass } from "@/shared/components/ui/button";
import { TextField } from "@/shared/components/ui/text-field";
import { recordRentalPaymentAction } from "@/features/hr/actions/worker-rental.actions";
import type { WorkerRentalAgreement } from "@/features/hr/types/worker-rental.types";

export function RentalPaymentModal({
  isOpen,
  onClose,
  agreement,
}: {
  isOpen: boolean;
  onClose: () => void;
  agreement: WorkerRentalAgreement;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState(
    agreement.remainingBalance > 0 ? String(agreement.remainingBalance) : String(agreement.unitRate)
  );
  const [paymentMethod, setPaymentMethod] = useState<"bank_transfer" | "check" | "cash">("bank_transfer");
  const [recipientType, setRecipientType] = useState<"partner_company" | "worker">("partner_company");
  const [recipientName, setRecipientName] = useState(agreement.partnerCompanyName);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  if (!isOpen) return null;

  function handleRecipientTypeChange(type: "partner_company" | "worker") {
    setRecipientType(type);
    if (type === "partner_company") {
      setRecipientName(agreement.partnerCompanyName);
    } else {
      setRecipientName(agreement.workerName);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setError("Payment amount must be greater than zero.");
      return;
    }
    if (!recipientName.trim()) {
      setError("Recipient name is required.");
      return;
    }

    startTransition(async () => {
      const res = await recordRentalPaymentAction({
        agreementId: agreement.id,
        paymentDate,
        amount: amt,
        currency: agreement.currency,
        paymentMethod,
        recipientType,
        recipientName,
        reference,
        notes,
      });

      if (res.error) {
        setError(res.error);
        return;
      }

      onClose();
      router.refresh();
    });
  }

  return (
    <ModalPortal><div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-[var(--radius-card)] bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[var(--color-border-subtle)] pb-3">
          <div>
            <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
              Record Worker Rental Payment
            </h3>
            <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
              Agreement: <strong className="text-[var(--color-text-primary)]">{agreement.agreementNumber}</strong> · Outstanding:{" "}
              <strong className="text-emerald-600 dark:text-emerald-400">
                {agreement.remainingBalance} {agreement.currency}
              </strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-lg p-1"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3 text-xs rounded-[var(--radius-control)] bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Recipient Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
              Payment Recipient
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleRecipientTypeChange("partner_company")}
                className={`p-2.5 rounded-[var(--radius-control)] text-xs font-medium border text-left transition-colors ${
                  recipientType === "partner_company"
                    ? "border-[var(--color-action-primary)] bg-[var(--color-action-primary)]/10 text-[var(--color-text-primary)]"
                    : "border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]"
                }`}
              >
                🏢 Lending Company (Company B)
              </button>
              <button
                type="button"
                onClick={() => handleRecipientTypeChange("worker")}
                className={`p-2.5 rounded-[var(--radius-control)] text-xs font-medium border text-left transition-colors ${
                  recipientType === "worker"
                    ? "border-[var(--color-action-primary)] bg-[var(--color-action-primary)]/10 text-[var(--color-text-primary)]"
                    : "border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]"
                }`}
              >
                👤 Worker Directly
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Recipient Name *"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
            />
            <TextField
              label={`Amount (${agreement.currency}) *`}
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Payment Date *"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--color-text-secondary)]">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className={selectClass}
              >
                <option value="bank_transfer">Bank Transfer (Virement)</option>
                <option value="check">Check (Chèque)</option>
                <option value="cash">Cash (Espèces)</option>
              </select>
            </div>
          </div>

          <TextField
            label="Transaction Reference / Check #"
            placeholder="e.g. VIR-SEPA-88492 or CHQ-0934"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />

          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--color-text-secondary)]">Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Settlement for October 2026 timesheets..."
              className={textareaClass}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border-subtle)]">
            <Button variant="secondary" onClick={onClose} disabled={pending} className="text-xs">
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={pending} className="text-xs">
              {pending ? "Recording..." : "Record Payment"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  </ModalPortal>
  );
}

