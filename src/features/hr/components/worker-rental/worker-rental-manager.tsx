"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/ui/button";
import { StatusBadge } from "@/shared/components/data-display/status-badge";
import {
  type WorkerRentalAgreement,
  type WorkerRentalStats,
} from "@/features/hr/types/worker-rental.types";
import { WorkerRentalModal } from "./worker-rental-modal";
import { TimesheetLogModal } from "./timesheet-log-modal";
import { RentalPaymentModal } from "./rental-payment-modal";
import { deleteWorkerRentalAction } from "@/features/hr/actions/worker-rental.actions";

export function WorkerRentalManager({
  initialAgreements = [],
  stats,
}: {
  initialAgreements: WorkerRentalAgreement[];
  stats: WorkerRentalStats;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAgreement, setEditingAgreement] = useState<WorkerRentalAgreement | null>(null);
  const [timesheetAgreement, setTimesheetAgreement] = useState<WorkerRentalAgreement | null>(null);
  const [paymentAgreement, setPaymentAgreement] = useState<WorkerRentalAgreement | null>(null);

  // Filters state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const fmt = (n: number, c = "TND") =>
    new Intl.NumberFormat("fr-TN", { style: "currency", currency: c }).format(n || 0);

  const filtered = initialAgreements.filter((a) => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (typeFilter !== "all" && a.type !== typeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        a.agreementNumber.toLowerCase().includes(q) ||
        a.workerName.toLowerCase().includes(q) ||
        a.workerRole.toLowerCase().includes(q) ||
        a.partnerCompanyName.toLowerCase().includes(q) ||
        (a.departmentName && a.departmentName.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  async function handleDelete(a: WorkerRentalAgreement) {
    if (!confirm(`Are you sure you want to delete agreement ${a.agreementNumber}? All associated timesheets and payments will also be deleted.`)) {
      return;
    }

    startTransition(async () => {
      await deleteWorkerRentalAction(a.id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* KPI Stats Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="p-4 bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-[var(--radius-card)] shadow-sm space-y-1">
          <div className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
            Active Rented Workers
          </div>
          <div className="text-2xl font-bold text-[var(--color-text-primary)]">
            {stats.activeAgreements}
          </div>
          <div className="text-[11px] text-[var(--color-text-secondary)]">
            {stats.rentInCount} Rent-In · {stats.lendOutCount} Lend-Out
          </div>
        </div>

        <div className="p-4 bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-[var(--radius-card)] shadow-sm space-y-1">
          <div className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
            Total Incurred Cost
          </div>
          <div className="text-2xl font-bold text-[var(--color-text-primary)]">
            {fmt(stats.totalCostIncurred, stats.currency)}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400">
            Across {stats.totalAgreements} contract(s)
          </div>
        </div>

        <div className="p-4 bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-[var(--radius-card)] shadow-sm space-y-1">
          <div className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
            Total Settled Payments
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {fmt(stats.totalPaidAmount, stats.currency)}
          </div>
          <div className="text-[11px] text-[var(--color-text-secondary)]">
            Disbursed to workers & partner firms
          </div>
        </div>

        <div className="p-4 bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-[var(--radius-card)] shadow-sm space-y-1">
          <div className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
            Pending Balance Due
          </div>
          <div
            className={`text-2xl font-bold ${
              stats.totalPendingBalance > 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-[var(--color-text-primary)]"
            }`}
          >
            {fmt(stats.totalPendingBalance, stats.currency)}
          </div>
          <div className="text-[11px] text-[var(--color-text-secondary)]">
            {stats.totalPendingBalance > 0 ? "Outstanding payout liability" : "Fully settled"}
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Filters & Action Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search worker, company, role, agreement #..."
              className="w-full text-xs px-3 py-2 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-action-primary)]"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs px-2.5 py-2 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)]"
          >
            <option value="all">All Types</option>
            <option value="rent_in">Rent-In (Incoming)</option>
            <option value="lend_out">Lend-Out (Outgoing)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-2.5 py-2 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)]"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="completed">Completed</option>
            <option value="terminated">Terminated</option>
          </select>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsCreateOpen(true)}
          className="text-xs shrink-0"
        >
          + New Worker Rental
        </Button>
      </div>

      {/* Agreements Table */}
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)]/60 text-[var(--color-text-secondary)] font-medium">
                <th className="py-3 px-4">Agreement #</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Worker & Role</th>
                <th className="py-3 px-4">Partner Company</th>
                <th className="py-3 px-4">Contract Period</th>
                <th className="py-3 px-4 text-right">Rate</th>
                <th className="py-3 px-4 text-right">Incurred / Paid</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-subtle)]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-sm text-[var(--color-text-secondary)]">
                    {search || statusFilter !== "all" || typeFilter !== "all" ? (
                      "No rental agreements matched your filters."
                    ) : (
                      <div className="space-y-3">
                        <div className="text-3xl">🤝</div>
                        <div className="font-semibold text-[var(--color-text-primary)]">
                          No Worker Rental Agreements Yet
                        </div>
                        <p className="text-xs max-w-sm mx-auto">
                          Rent skilled specialists from external partner companies or lend out internal workforce with full timesheet tracking and payment settlements.
                        </p>
                        <Button
                          variant="primary"
                          onClick={() => setIsCreateOpen(true)}
                          className="text-xs"
                        >
                          Create First Worker Rental
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((agreement) => (
                  <tr
                    key={agreement.id}
                    className="hover:bg-[var(--color-bg-subtle)]/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <Link
                        href={`/hr/rentals/${agreement.id}`}
                        className="font-mono font-semibold text-[var(--color-action-primary)] hover:underline"
                      >
                        {agreement.agreementNumber}
                      </Link>
                      {agreement.projectReference && (
                        <div className="text-[10px] text-[var(--color-text-secondary)] truncate max-w-[120px]">
                          {agreement.projectReference}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                          agreement.type === "rent_in"
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                            : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                        }`}
                      >
                        {agreement.type === "rent_in" ? "📥 Rent-In" : "📤 Lend-Out"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[var(--color-text-primary)]">
                        {agreement.workerName}
                      </div>
                      <div className="text-[11px] text-[var(--color-text-secondary)]">
                        {agreement.workerRole}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-[var(--color-text-primary)]">
                        {agreement.partnerCompanyName}
                      </div>
                      {agreement.partnerContactPerson && (
                        <div className="text-[10px] text-[var(--color-text-secondary)]">
                          Attn: {agreement.partnerContactPerson}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[var(--color-text-secondary)] whitespace-nowrap">
                      <div>{agreement.startDate}</div>
                      <div className="text-[10px] opacity-75">to {agreement.endDate}</div>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <span className="font-semibold text-[var(--color-text-primary)]">
                        {fmt(agreement.unitRate, agreement.currency)}
                      </span>
                      <span className="text-[10px] text-[var(--color-text-secondary)] block">
                        /{agreement.rateType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="font-semibold text-[var(--color-text-primary)]">
                        {fmt(agreement.totalCostIncurred, agreement.currency)}
                      </div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                        Paid: {fmt(agreement.totalPaidAmount, agreement.currency)}
                      </div>
                      {agreement.remainingBalance > 0 && (
                        <div className="text-[10px] text-rose-500 font-medium">
                          Due: {fmt(agreement.remainingBalance, agreement.currency)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
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
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setTimesheetAgreement(agreement)}
                          className="px-2 py-1 rounded bg-[var(--color-bg-subtle)] hover:bg-[var(--color-bg-subtle)]/80 text-[var(--color-text-primary)] text-[11px] font-medium"
                          title="Log timesheet / hours"
                        >
                          ⏱️ Log Work
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentAgreement(agreement)}
                          className="px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium"
                          title="Record payment settlement"
                        >
                          💳 Pay
                        </button>
                        <Link
                          href={`/hr/rentals/${agreement.id}`}
                          className="px-2 py-1 rounded bg-[var(--color-action-primary)]/10 hover:bg-[var(--color-action-primary)]/20 text-[var(--color-action-primary)] text-[11px] font-medium"
                        >
                          Details
                        </Link>
                        <button
                          type="button"
                          onClick={() => setEditingAgreement(agreement)}
                          className="p-1 rounded text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                          title="Edit agreement"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(agreement)}
                          disabled={pending}
                          className="p-1 rounded text-rose-500 hover:text-rose-700"
                          title="Delete agreement"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {isCreateOpen && (
        <WorkerRentalModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
        />
      )}

      {editingAgreement && (
        <WorkerRentalModal
          isOpen={true}
          initialData={editingAgreement}
          onClose={() => setEditingAgreement(null)}
        />
      )}

      {timesheetAgreement && (
        <TimesheetLogModal
          isOpen={true}
          agreement={timesheetAgreement}
          onClose={() => setTimesheetAgreement(null)}
        />
      )}

      {paymentAgreement && (
        <RentalPaymentModal
          isOpen={true}
          agreement={paymentAgreement}
          onClose={() => setPaymentAgreement(null)}
        />
      )}
    </div>
  );
}

