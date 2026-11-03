"use client";
import { ModalPortal } from "@/shared/components/ui/modal-portal";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { postInvoiceAction, voidInvoiceAction } from "@/features/finance/actions/finance.actions";
import { InvoiceCollectionModal } from "@/features/finance/components/invoice-collection-modal";
import { Button } from "@/shared/components/ui/button";
import { FormMessage } from "@/shared/components/ui/form-message";

export function InvoiceDetailActions({
  invoiceId,
  invoiceNumber,
  status,
  canPost,
  customerEmail,
  balance = 0,
}: {
  invoiceId: string;
  invoiceNumber: string;
  status: string;
  canPost: boolean;
  customerEmail?: string;
  balance?: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [voidReason, setVoidReason] = useState("");

  function handlePrint() {
    const originalTitle = document.title;
    document.title = `Invoice_${invoiceNumber}`;
    window.print();
    const handleAfterPrint = () => {
      document.title = originalTitle;
      window.removeEventListener("afterprint", handleAfterPrint);
    };
    window.addEventListener("afterprint", handleAfterPrint);
    setTimeout(() => {
      document.title = originalTitle;
    }, 2000);
  }

  function handlePost() {
    if (!confirm(`Are you sure you want to officially post invoice ${invoiceNumber}? This will mark it as posted.`)) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await postInvoiceAction(invoiceId);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function handleVoid(e: React.FormEvent) {
    e.preventDefault();
    if (!voidReason.trim()) {
      setError("Please provide a reason for voiding this invoice.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await voidInvoiceAction({ invoiceId, reason: voidReason.trim() });
      if (res.error) {
        setError(res.error);
        return;
      }
      setShowVoidModal(false);
      router.refresh();
    });
  }

  const canRemind = balance > 0 && status !== "draft" && status !== "voided" && status !== "cancelled";

  return (
    <div className="space-y-3">
      {/* Action buttons (hidden when printing) */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/finance/invoices"
          className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center gap-1"
        >
          ← Back to Invoices
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {/* AI Collection Notice */}
          {canRemind && (
            <Button
              variant="secondary"
              onClick={() => setShowNoticeModal(true)}
              className="flex items-center gap-1.5 border-[var(--color-action-primary)]/40 hover:bg-[var(--color-action-primary)]/10 text-xs"
            >
              <span>✨</span>
              <span>AI Reminder Letter</span>
            </Button>
          )}

          {/* Print / Download PDF */}
          <Button variant="secondary" onClick={handlePrint} className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
              <path d="M6 14h12v8H6z" />
            </svg>
            Export PDF / Print
          </Button>

          {/* Post Invoice Button */}
          {canPost && status === "draft" && (
            <Button variant="primary" onClick={handlePost} disabled={pending}>
              {pending ? "Posting..." : "Post Invoice"}
            </Button>
          )}

          {/* Void Invoice Button */}
          {canPost && status !== "voided" && status !== "cancelled" && (
            <Button
              variant="danger"
              onClick={() => setShowVoidModal(true)}
              disabled={pending}
            >
              Void Invoice
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="print:hidden">
          <FormMessage kind="error">{error}</FormMessage>
        </div>
      )}

      {/* AI Collection Notice Modal */}
      <InvoiceCollectionModal
        isOpen={showNoticeModal}
        onClose={() => setShowNoticeModal(false)}
        invoiceId={invoiceId}
        invoiceNumber={invoiceNumber}
        customerEmail={customerEmail}
        balance={balance}
      />

      {/* Void Reason Modal */}
      {showVoidModal && (
        <ModalPortal><div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 print:hidden backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
              Void Invoice: {invoiceNumber}
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Voiding cancels this invoice and zeros its receivable balance. A mandatory reason is required for tax and audit logs.
            </p>
            <form onSubmit={handleVoid} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-[var(--color-text-secondary)]">
                  Reason for Voiding *
                </label>
                <textarea
                  required
                  rows={3}
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="e.g. Billing address error, customer order cancelled..."
                  className="w-full rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-[3px] focus:ring-[var(--color-focus-ring)]"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setShowVoidModal(false)}
                  disabled={pending}
                >
                  Cancel
                </Button>
                <Button variant="danger" type="submit" disabled={pending || !voidReason.trim()}>
                  {pending ? "Voiding..." : "Confirm Void"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </ModalPortal>
      )}
    </div>
  );
}
