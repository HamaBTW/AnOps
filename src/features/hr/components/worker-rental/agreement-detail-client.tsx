"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/ui/button";
import { StatusBadge } from "@/shared/components/data-display/status-badge";
import type {
  WorkerRentalAgreement,
  WorkerRentalTimesheet,
  WorkerRentalPayment,
} from "@/features/hr/types/worker-rental.types";
import { TimesheetLogModal } from "./timesheet-log-modal";
import { RentalPaymentModal } from "./rental-payment-modal";
import { RentalAgreementDocModal } from "./rental-agreement-doc-modal";
import { WorkerRentalModal } from "./worker-rental-modal";
import {
  deleteRentalTimesheetAction,
  deleteRentalPaymentAction,
  deleteWorkerRentalAction,
} from "@/features/hr/actions/worker-rental.actions";

export function AgreementDetailClient({
  agreement,
  timesheets = [],
  payments = [],
}: {
  agreement: WorkerRentalAgreement;
  timesheets: WorkerRentalTimesheet[];
  payments: WorkerRentalPayment[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isTimesheetOpen, setIsTimesheetOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"timesheets" | "payments">("timesheets");

  const fmt = (n: number, c = agreement.currency || "TND") =>
    new Intl.NumberFormat("fr-TN", { style: "currency", currency: c }).format(n || 0);

  async function handleDeleteTimesheet(id: string) {
    if (!confirm("Are you sure you want to delete this timesheet entry?")) return;
    startTransition(async () => {
      await deleteRentalTimesheetAction(id, agreement.id);
      router.refresh();
    });
  }

  async function handleDeletePayment(id: string) {
    if (!confirm("Are you sure you want to delete this payment record?")) return;
    startTransition(async () => {
      await deleteRentalPaymentAction(id, agreement.id);
      router.refresh();
    });
  }

  async function handleDeleteAgreement() {
    if (!confirm(`Are you sure you want to delete agreement ${agreement.agreementNumber}?`)) return;
    startTransition(async () => {
      await deleteWorkerRentalAction(agreement.id);
      router.push("/hr/rentals");
    });
  }

  const paymentPercentage =
    agreement.totalCostIncurred > 0
      ? Math.min(100, Math.round((agreement.totalPaidAmount / agreement.totalCostIncurred) * 100))
      : 100;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/hr/rentals"
              className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
              ← Back to Worker Rentals
            </Link>
            <span className="text-xs text-[var(--color-text-secondary)]">/</span>
            <span className="text-xs font-mono font-medium text-[var(--color-text-primary)]">
              {agreement.agreementNumber}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
              {agreement.workerName}
            </h1>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                agreement.type === "rent_in"
                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                  : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
              }`}
            >
              {agreement.type === "rent_in" ? "📥 Rent-In" : "📤 Lend-Out"}
            </span>
            <StatusBadge
              label={
                agreement.status === "active"
                  ? "Active"
                  : agreement.status === "completed"
                  ? "Completed"
                  : agreement.status === "terminated"
                  ? "Terminated"
                  : "Draft"
              }
              tone={
                agreement.status === "active"
                  ? "success"
                  : agreement.status === "completed"
                  ? "info"
                  : agreement.status === "terminated"
                  ? "error"
                  : "neutral"
              }
            />
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
            {agreement.workerRole} · Contract with <strong>{agreement.partnerCompanyName}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <RentalAgreementDocModal agreement={agreement} />
          <Button
            variant="secondary"
            onClick={() => setIsTimesheetOpen(true)}
            className="text-xs"
          >
            ⏱️ Log Work
          </Button>
          <Button
            variant="primary"
            onClick={() => setIsPaymentOpen(true)}
            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            💳 Record Payment
          </Button>
          <button
            type="button"
            onClick={() => setIsEditOpen(true)}
            className="p-2 text-xs rounded border border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]"
            title="Edit Agreement"
          >
            ✏️
          </button>
          <button
            type="button"
            onClick={handleDeleteAgreement}
            disabled={pending}
            className="p-2 text-xs rounded border border-rose-500/20 text-rose-500 hover:bg-rose-500/10"
            title="Delete Agreement"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Financial Health & Progress Banner */}
      <div className="p-5 rounded-[var(--radius-card)] bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] shadow-sm space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Agreed Billing Rate
            </div>
            <div className="text-xl font-bold text-[var(--color-text-primary)] mt-1">
              {fmt(agreement.unitRate, agreement.currency)}
            </div>
            <div className="text-[10px] text-[var(--color-text-secondary)]">
              Billed per {agreement.rateType}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Total Logged Units
            </div>
            <div className="text-xl font-bold text-[var(--color-text-primary)] mt-1">
              {agreement.totalLoggedUnits} {agreement.rateType === "hourly" ? "Hours" : "Days"}
            </div>
            <div className="text-[10px] text-[var(--color-text-secondary)]">
              Estimated: {agreement.estimatedUnits || "Open"}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Incurred Cost to Date
            </div>
            <div className="text-xl font-bold text-[var(--color-text-primary)] mt-1">
              {fmt(agreement.totalCostIncurred, agreement.currency)}
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
              Paid: {fmt(agreement.totalPaidAmount, agreement.currency)}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Remaining Balance Due
            </div>
            <div
              className={`text-xl font-bold mt-1 ${
                agreement.remainingBalance > 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {fmt(agreement.remainingBalance, agreement.currency)}
            </div>
            <div className="text-[10px] text-[var(--color-text-secondary)]">
              {agreement.remainingBalance === 0 ? "Fully Settled" : "Liability Outstanding"}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1 pt-2 border-t border-[var(--color-border-subtle)]">
          <div className="flex items-center justify-between text-[11px] text-[var(--color-text-secondary)]">
            <span>Settlement Progress</span>
            <span className="font-semibold text-[var(--color-text-primary)]">{paymentPercentage}% Paid</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[var(--color-bg-subtle)] overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${paymentPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2-Column Info Cards: Worker Profile & Partner Profile */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Worker Card */}
        <div className="p-4 rounded-[var(--radius-card)] bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] shadow-sm space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] flex items-center gap-1.5">
            <span>👤</span> Worker Profile & Assignment
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-[var(--color-border-subtle)]">
              <span className="text-[var(--color-text-secondary)]">Worker Name:</span>
              <span className="font-semibold text-[var(--color-text-primary)]">{agreement.workerName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[var(--color-border-subtle)]">
              <span className="text-[var(--color-text-secondary)]">Specialty / Role:</span>
              <span className="font-medium text-[var(--color-text-primary)]">{agreement.workerRole}</span>
            </div>
            {agreement.workerEmail && (
              <div className="flex justify-between py-1 border-b border-[var(--color-border-subtle)]">
                <span className="text-[var(--color-text-secondary)]">Email:</span>
                <a href={`mailto:${agreement.workerEmail}`} className="text-[var(--color-action-primary)] hover:underline">
                  {agreement.workerEmail}
                </a>
              </div>
            )}
            {agreement.workerPhone && (
              <div className="flex justify-between py-1 border-b border-[var(--color-border-subtle)]">
                <span className="text-[var(--color-text-secondary)]">Phone:</span>
                <span className="text-[var(--color-text-primary)]">{agreement.workerPhone}</span>
              </div>
            )}
            {agreement.workerNationalId && (
              <div className="flex justify-between py-1 border-b border-[var(--color-border-subtle)]">
                <span className="text-[var(--color-text-secondary)]">National ID (CIN):</span>
                <span className="font-mono text-[var(--color-text-primary)]">{agreement.workerNationalId}</span>
              </div>
            )}
            <div className="flex justify-between py-1 border-b border-[var(--color-border-subtle)]">
              <span className="text-[var(--color-text-secondary)]">Assigned Department:</span>
              <span className="text-[var(--color-text-primary)]">{agreement.departmentName || "General Operations"}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[var(--color-text-secondary)]">Internal Supervisor:</span>
              <span className="text-[var(--color-text-primary)]">{agreement.supervisorName || "Unassigned"}</span>
            </div>
          </div>
        </div>

        {/* Partner Firm Card */}
        <div className="p-4 rounded-[var(--radius-card)] bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] shadow-sm space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] flex items-center gap-1.5">
            <span>🏢</span> Partner Company (Company B)
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-[var(--color-border-subtle)]">
              <span className="text-[var(--color-text-secondary)]">Company Name:</span>
              <span className="font-semibold text-[var(--color-text-primary)]">{agreement.partnerCompanyName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[var(--color-border-subtle)]">
              <span className="text-[var(--color-text-secondary)]">Representative:</span>
              <span className="font-medium text-[var(--color-text-primary)]">
                {agreement.partnerContactPerson || "Executive Desk"}
              </span>
            </div>
            {agreement.partnerEmail && (
              <div className="flex justify-between py-1 border-b border-[var(--color-border-subtle)]">
                <span className="text-[var(--color-text-secondary)]">Email:</span>
                <a href={`mailto:${agreement.partnerEmail}`} className="text-[var(--color-action-primary)] hover:underline">
                  {agreement.partnerEmail}
                </a>
              </div>
            )}
            {agreement.partnerPhone && (
              <div className="flex justify-between py-1 border-b border-[var(--color-border-subtle)]">
                <span className="text-[var(--color-text-secondary)]">Phone:</span>
                <span className="text-[var(--color-text-primary)]">{agreement.partnerPhone}</span>
              </div>
            )}
            {agreement.partnerTaxId && (
              <div className="flex justify-between py-1 border-b border-[var(--color-border-subtle)]">
                <span className="text-[var(--color-text-secondary)]">Tax ID / MF:</span>
                <span className="font-mono text-[var(--color-text-primary)]">{agreement.partnerTaxId}</span>
              </div>
            )}
            <div className="flex justify-between py-1 border-b border-[var(--color-border-subtle)]">
              <span className="text-[var(--color-text-secondary)]">Mission Duration:</span>
              <span className="font-mono text-[var(--color-text-primary)]">
                {agreement.startDate} → {agreement.endDate}
              </span>
            </div>
            {agreement.projectReference && (
              <div className="flex justify-between py-1">
                <span className="text-[var(--color-text-secondary)]">Project Code:</span>
                <span className="font-mono text-[var(--color-action-primary)]">{agreement.projectReference}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs: Timesheets vs Payments */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--color-border-subtle)] pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("timesheets")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-control)] transition-colors ${
              activeTab === "timesheets"
                ? "bg-[var(--color-action-primary)] text-white"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            ⏱️ Work Logs & Timesheets ({timesheets.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("payments")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-control)] transition-colors ${
              activeTab === "payments"
                ? "bg-[var(--color-action-primary)] text-white"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            💳 Disbursements & Payments ({payments.length})
          </button>
        </div>

        {/* Tab 1: Timesheets */}
        {activeTab === "timesheets" && (
          <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] overflow-hidden shadow-sm">
            <div className="p-3 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                Detailed Work Logs for {agreement.workerName}
              </span>
              <Button
                variant="primary"
                onClick={() => setIsTimesheetOpen(true)}
                className="text-xs"
              >
                + Log Work Day/Hours
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[var(--color-bg-subtle)]/70 text-[var(--color-text-secondary)]">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-right">Units Worked</th>
                    <th className="py-2.5 px-3 text-right">Overtime</th>
                    <th className="py-2.5 px-3 text-right">Unit Rate</th>
                    <th className="py-2.5 px-3 text-right">Calculated Cost</th>
                    <th className="py-2.5 px-3">Task Description</th>
                    <th className="py-2.5 px-3">Approved By</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-subtle)]">
                  {timesheets.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-xs text-[var(--color-text-secondary)]">
                        No timesheet entries recorded yet. Click &quot;+ Log Work Day/Hours&quot; to add.
                      </td>
                    </tr>
                  ) : (
                    timesheets.map((ts) => (
                      <tr key={ts.id} className="hover:bg-[var(--color-bg-subtle)]/40 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-[var(--color-text-primary)] font-medium">
                          {ts.workDate}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-[var(--color-text-primary)]">
                          {ts.unitsWorked} {agreement.rateType === "hourly" ? "hrs" : "day(s)"}
                        </td>
                        <td className="py-2.5 px-3 text-right text-[var(--color-text-secondary)]">
                          {ts.overtimeHours > 0 ? `${ts.overtimeHours} hrs` : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right text-[var(--color-text-secondary)]">
                          {fmt(ts.unitRate, agreement.currency)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-[var(--color-text-primary)]">
                          {fmt(ts.amount, agreement.currency)}
                        </td>
                        <td className="py-2.5 px-3 text-[var(--color-text-secondary)] max-w-xs truncate">
                          {ts.taskDescription || "General task execution"}
                        </td>
                        <td className="py-2.5 px-3 text-[var(--color-text-secondary)]">
                          {ts.approvedBy || "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteTimesheet(ts.id)}
                            disabled={pending}
                            className="text-rose-500 hover:text-rose-700 text-xs"
                            title="Delete log"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Payments */}
        {activeTab === "payments" && (
          <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] overflow-hidden shadow-sm">
            <div className="p-3 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                Recorded Payments & Payout History
              </span>
              <Button
                variant="primary"
                onClick={() => setIsPaymentOpen(true)}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                + Record Payment
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[var(--color-bg-subtle)]/70 text-[var(--color-text-secondary)]">
                  <tr>
                    <th className="py-2.5 px-3">Payment Date</th>
                    <th className="py-2.5 px-3">Recipient</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3">Reference</th>
                    <th className="py-2.5 px-3 text-right">Amount Paid</th>
                    <th className="py-2.5 px-3">Notes</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-subtle)]">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-xs text-[var(--color-text-secondary)]">
                        No payments recorded yet. Click &quot;+ Record Payment&quot; when compensation or vendor invoices are settled.
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => (
                      <tr key={p.id} className="hover:bg-[var(--color-bg-subtle)]/40 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-[var(--color-text-primary)] font-medium">
                          {p.paymentDate}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-[var(--color-text-primary)]">
                            {p.recipientName}
                          </div>
                          <div className="text-[10px] text-[var(--color-text-secondary)]">
                            {p.recipientType === "partner_company" ? "🏢 Partner Firm" : "👤 Worker Direct"}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 capitalize text-[var(--color-text-secondary)]">
                          {p.paymentMethod.replace("_", " ")}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[var(--color-text-secondary)]">
                          {p.reference || "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {fmt(p.amount, p.currency)}
                        </td>
                        <td className="py-2.5 px-3 text-[var(--color-text-secondary)] max-w-xs truncate">
                          {p.notes || "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeletePayment(p.id)}
                            disabled={pending}
                            className="text-rose-500 hover:text-rose-700 text-xs"
                            title="Delete payment"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {isEditOpen && (
        <WorkerRentalModal
          isOpen={true}
          initialData={agreement}
          onClose={() => setIsEditOpen(false)}
        />
      )}

      {isTimesheetOpen && (
        <TimesheetLogModal
          isOpen={true}
          agreement={agreement}
          onClose={() => setIsTimesheetOpen(false)}
        />
      )}

      {isPaymentOpen && (
        <RentalPaymentModal
          isOpen={true}
          agreement={agreement}
          onClose={() => setIsPaymentOpen(false)}
        />
      )}
    </div>
  );
}

