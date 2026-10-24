"use client";

import { useState, useTransition, useMemo } from "react";
import {
  Calendar,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Check,
  X,
  Loader2,
  RefreshCw,
  AlertCircle,
  FileText,
} from "lucide-react";
import type { Employee, LeaveRequest, LeaveBalance, LeaveStatus } from "@/features/hr/types";
import { LeaveRequestModal } from "./leave-request-modal";
import { reviewLeaveRequestAction } from "@/features/hr/actions/leave.action";
import { Portal } from "@/shared/components/ui/portal";

type LeaveSectionProps = {
  leaveRequests: LeaveRequest[];
  employees: Employee[];
  currentEmployee?: Employee | null;
  leaveBalance: LeaveBalance;
  onRefresh: () => void;
};

export function LeaveSection({
  leaveRequests,
  employees,
  currentEmployee,
  leaveBalance,
  onRefresh,
}: LeaveSectionProps) {
  const [isPending, startTransition] = useTransition();
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"all" | "my">("all");

  // Review modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [requestToReview, setRequestToReview] = useState<LeaveRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve");
  const [adminComment, setAdminComment] = useState("");
  const [reviewError, setReviewError] = useState<string | null>(null);

  const filteredRequests = useMemo(() => {
    return leaveRequests.filter((r) => {
      if (activeTab === "my" && currentEmployee && r.employeeId !== currentEmployee.id) {
        return false;
      }
      if (statusFilter !== "all" && r.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [leaveRequests, activeTab, currentEmployee, statusFilter]);

  const pendingApprovalsCount = useMemo(() => {
    return leaveRequests.filter((r) => r.status === "pending").length;
  }, [leaveRequests]);

  const handleOpenReview = (request: LeaveRequest, action: "approve" | "reject") => {
    setRequestToReview(request);
    setReviewAction(action);
    setAdminComment("");
    setReviewError(null);
    setReviewModalOpen(true);
  };

  const handleConfirmReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestToReview) return;

    startTransition(async () => {
      const reviewerName = currentEmployee?.fullName || "HR Administrator";
      const res = await reviewLeaveRequestAction(
        {
          requestId: requestToReview.id,
          action: reviewAction,
          adminComment: adminComment.trim() || undefined,
        },
        reviewerName
      );

      if (res.error) {
        setReviewError(res.error);
      } else {
        setReviewModalOpen(false);
        setRequestToReview(null);
        onRefresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards: Leave Balance & Approvals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Allowance */}
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4 shadow-xs">
          <p className="text-xs font-medium text-[var(--color-text-secondary)]">
            Annual Allowance
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
              {leaveBalance.allowance}
            </span>
            <span className="text-xs text-[var(--color-text-secondary)]">days / yr</span>
          </div>
          <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">Standard paid quota</p>
        </div>

        {/* Used */}
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4 shadow-xs">
          <p className="text-xs font-medium text-[var(--color-text-secondary)]">
            Used Paid Days
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
              {leaveBalance.usedPaidDays}
            </span>
            <span className="text-xs text-[var(--color-text-secondary)]">days taken</span>
          </div>
          <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">Approved this year</p>
        </div>

        {/* Remaining */}
        <div className="rounded-[var(--radius-card)] border border-[var(--color-action-primary)]/40 bg-[var(--color-action-primary)]/10 p-4 shadow-xs">
          <p className="text-xs font-bold text-[var(--color-text-primary)]">
            Remaining Available
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
              {leaveBalance.remainingDays}
            </span>
            <span className="text-xs font-semibold text-[var(--color-text-primary)]">days left</span>
          </div>
          <p className="mt-1 text-[11px] text-[var(--color-text-primary)]">
            {currentEmployee?.fullName ?? "Your Balance"}
          </p>
        </div>

        {/* Pending Approvals */}
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4 shadow-xs">
          <p className="text-xs font-medium text-[var(--color-text-secondary)]">
            Pending Approvals
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-[var(--color-status-warning)]">
              {pendingApprovalsCount}
            </span>
            <span className="text-xs text-[var(--color-text-secondary)]">requests</span>
          </div>
          <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">Awaiting HR decision</p>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4 sm:p-6 shadow-xs space-y-4">
        {/* Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                Time-off & Leave Management
              </h3>
              {pendingApprovalsCount > 0 && (
                <span className="rounded-full bg-[var(--color-warning-bg)] border border-[var(--color-warning-border)] px-2.5 py-0.5 text-xs font-bold text-[var(--color-warning-text)]">
                  {pendingApprovalsCount} Pending
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              Review employee requests, balances, and approve time-off workflows
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onRefresh}
              className="flex min-h-[40px] items-center gap-1.5 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-3 text-xs font-bold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => setRequestModalOpen(true)}
              className="flex min-h-[40px] items-center gap-2 rounded-[var(--radius-control)] bg-[var(--color-action-primary)] px-4 text-xs font-bold text-[var(--color-action-on-primary)] hover:bg-[var(--color-action-hover)] transition-colors shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Request Leave</span>
            </button>
          </div>
        </div>

        {/* Tab & Status Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-y border-[var(--color-border-subtle)] py-3">
          {/* My vs All Tabs */}
          <div className="flex items-center gap-1 bg-[var(--color-bg-subtle)] p-1 rounded-[var(--radius-control)]">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-[calc(var(--radius-control)-2px)] text-xs font-bold transition-all ${
                activeTab === "all"
                  ? "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] shadow-xs"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              All Requests ({leaveRequests.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("my")}
              className={`px-3 py-1.5 rounded-[calc(var(--radius-control)-2px)] text-xs font-bold transition-all ${
                activeTab === "my"
                  ? "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] shadow-xs"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              My Requests
            </button>
          </div>

          {/* Status Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {["all", "pending", "approved", "rejected"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`min-h-[32px] px-3 rounded-[var(--radius-pill)] text-xs font-bold capitalize transition-colors ${
                  statusFilter === st
                    ? "bg-[var(--color-text-primary)] text-[var(--color-bg-surface)]"
                    : "border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Leave Requests Table */}
        <div className="overflow-x-auto rounded-[var(--radius-control)] border border-[var(--color-border-subtle)]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Leave Type</th>
                <th className="px-4 py-3">Duration (Working Days)</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">
                    <FileText className="mx-auto h-8 w-8 opacity-40 mb-2" />
                    <p className="font-medium">No leave requests found</p>
                    <p className="text-[11px] mt-0.5">Submit a new request to see it listed here.</p>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const isPendingStatus = req.status === "pending";
                  const isApproved = req.status === "approved";

                  return (
                    <tr key={req.id} className="hover:bg-[var(--color-bg-subtle)]/50 transition-colors">
                      {/* Employee */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-[var(--color-text-primary)]">
                          {req.employeeName}
                        </div>
                        <div className="text-[11px] text-[var(--color-text-secondary)]">
                          {req.departmentName}
                        </div>
                      </td>

                      {/* Leave Type */}
                      <td className="px-4 py-3.5">
                        <div className="font-medium capitalize text-[var(--color-text-primary)]">
                          {req.leaveType.replace("_", " / ")}
                        </div>
                        <span
                          className={`inline-block mt-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold ${
                            req.isPaid
                              ? "bg-[var(--color-status-success-bg)] text-[var(--color-status-success)]"
                              : "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)] border border-[var(--color-warning-border)]"
                          }`}
                        >
                          {req.isPaid ? "Paid" : "Unpaid (Payroll Deduction)"}
                        </span>
                      </td>

                      {/* Duration */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-[var(--color-text-primary)]">
                          {req.days} working day{req.days > 1 ? "s" : ""}
                        </div>
                        <div className="text-[11px] text-[var(--color-text-secondary)]">
                          {req.startDate} → {req.endDate}
                        </div>
                      </td>

                      {/* Reason & Comments */}
                      <td className="px-4 py-3.5 max-w-xs">
                        <p className="text-[var(--color-text-primary)] line-clamp-2">
                          {req.reason}
                        </p>
                        {req.adminComment && (
                          <p className="mt-1 text-[11px] text-[var(--color-text-secondary)] italic">
                            HR: "{req.adminComment}"
                          </p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            isPendingStatus
                              ? "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)] border border-[var(--color-warning-border)]"
                              : isApproved
                              ? "bg-[var(--color-status-success-bg)] text-[var(--color-status-success)]"
                              : "bg-[var(--color-status-error-bg)] text-[var(--color-status-error)]"
                          }`}
                        >
                          {isPendingStatus && <Clock className="h-3 w-3" />}
                          {isApproved && <CheckCircle className="h-3 w-3" />}
                          {req.status === "rejected" && <XCircle className="h-3 w-3" />}
                          {req.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        {isPendingStatus ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenReview(req, "approve")}
                              title="Approve Request"
                              className="flex h-8 items-center gap-1 rounded-[var(--radius-control)] bg-[var(--color-status-success)]/15 px-2.5 text-xs font-bold text-[var(--color-status-success)] hover:bg-[var(--color-status-success)]/25 transition-colors"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenReview(req, "reject")}
                              title="Reject Request"
                              className="flex h-8 items-center gap-1 rounded-[var(--radius-control)] bg-[var(--color-status-error)]/15 px-2.5 text-xs font-bold text-[var(--color-status-error)] hover:bg-[var(--color-status-error)]/25 transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-[var(--color-text-secondary)]">
                            {req.reviewedBy ? `Reviewed by ${req.reviewedBy}` : "Completed"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Leave Request Modal */}
      <LeaveRequestModal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        employees={employees}
        currentEmployee={currentEmployee}
        onSuccess={onRefresh}
      />

      {/* Review Confirmation Modal */}
      {reviewModalOpen && requestToReview && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div
              className="w-full max-w-md rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-3">
                <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                  {reviewAction === "approve" ? "Approve Leave Request" : "Reject Leave Request"}
                </h3>
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="rounded-full p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {reviewError && (
                <div className="mt-3 flex items-start gap-2 rounded bg-[var(--color-status-error-bg)] p-2.5 text-xs text-[var(--color-status-error)]">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{reviewError}</span>
                </div>
              )}

              <form onSubmit={handleConfirmReview} className="mt-4 space-y-3">
                <div className="rounded-[var(--radius-control)] bg-[var(--color-bg-subtle)] p-3 text-xs space-y-1">
                  <div className="font-bold text-[var(--color-text-primary)]">
                    {requestToReview.employeeName}
                  </div>
                  <div className="text-[var(--color-text-secondary)]">
                    {requestToReview.days} working day(s) ({requestToReview.startDate} → {requestToReview.endDate})
                  </div>
                  <div className="text-[var(--color-text-secondary)] italic">
                    "{requestToReview.reason}"
                  </div>
                  {!requestToReview.isPaid && (
                    <div className="text-[11px] font-bold text-[var(--color-warning-text)]">
                      * Note: This is an unpaid leave. Deductions will apply in payroll.
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--color-text-primary)] mb-1">
                    Admin Comment (Optional)
                  </label>
                  <textarea
                    value={adminComment}
                    onChange={(e) => setAdminComment(e.target.value)}
                    placeholder="Add an internal note or reason for the employee..."
                    rows={2}
                    className="w-full rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] p-2.5 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-action-primary)]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border-subtle)]">
                  <button
                    type="button"
                    onClick={() => setReviewModalOpen(false)}
                    disabled={isPending}
                    className="min-h-[38px] rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] px-3 text-xs font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className={`flex min-h-[38px] items-center gap-1.5 rounded-[var(--radius-control)] px-4 text-xs font-bold text-white transition-colors ${
                      reviewAction === "approve"
                        ? "bg-[var(--color-status-success)] hover:opacity-90"
                        : "bg-[var(--color-status-error)] hover:opacity-90"
                    }`}
                  >
                    {isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : reviewAction === "approve" ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <X className="h-3.5 w-3.5" />
                    )}
                    <span>Confirm {reviewAction === "approve" ? "Approval" : "Rejection"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
