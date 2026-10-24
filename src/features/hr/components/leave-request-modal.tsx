"use client";

import { useState, useTransition, useMemo } from "react";
import { X, Calendar, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import type { Employee, LeaveType } from "@/features/hr/types";
import { useScrollLock } from "@/shared/hooks/use-scroll-lock";
import { Portal } from "@/shared/components/ui/portal";
import { submitLeaveRequestAction } from "@/features/hr/actions/leave.action";

type LeaveRequestModalProps = {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  currentEmployee?: Employee | null;
  onSuccess?: () => void;
};

const LEAVE_TYPES: { type: LeaveType; label: string; defaultPaid: boolean; desc: string }[] = [
  { type: "annual", label: "Annual Leave", defaultPaid: true, desc: "Standard paid vacation from 25-day allowance" },
  { type: "sick", label: "Sick Leave", defaultPaid: true, desc: "Medical absence (cert required for >2 days)" },
  { type: "unpaid", label: "Unpaid Leave", defaultPaid: false, desc: "Deducted from salary: (Base / 22) * days" },
  { type: "maternity_paternity", label: "Maternity / Paternity", defaultPaid: true, desc: "60 days maternity / 5 days paternity" },
  { type: "bereavement", label: "Bereavement Leave", defaultPaid: true, desc: "3 days for immediate family members" },
  { type: "other", label: "Other Special Leave", defaultPaid: true, desc: "Subject to manager approval" },
];

export function LeaveRequestModal({
  isOpen,
  onClose,
  employees,
  currentEmployee,
  onSuccess,
}: LeaveRequestModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    currentEmployee?.id || (employees[0]?.id ?? "")
  );
  const [leaveType, setLeaveType] = useState<LeaveType>("annual");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [isPaid, setIsPaid] = useState<boolean>(true);

  useScrollLock(isOpen);

  // Automatically adjust isPaid default when leaveType changes
  const handleLeaveTypeChange = (type: LeaveType) => {
    setLeaveType(type);
    if (type === "unpaid") {
      setIsPaid(false);
    } else {
      setIsPaid(true);
    }
  };

  // Compute business days excluding Sat/Sun
  const calculatedDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0;

    let count = 0;
    const cur = new Date(s);
    while (cur <= e) {
      const day = cur.getDay();
      if (day !== 0 && day !== 6) {
        count++;
      }
      cur.setDate(cur.getDate() + 1);
    }
    return Math.max(1, count);
  }, [startDate, endDate]);

  const activeTargetEmployee = useMemo(() => {
    return employees.find((e) => e.id === selectedEmployeeId) || currentEmployee || employees[0];
  }, [employees, selectedEmployeeId, currentEmployee]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedEmployeeId) {
      setError("Please select an employee.");
      return;
    }
    if (!startDate || !endDate) {
      setError("Please specify both start and end dates.");
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setError("End date must be on or after start date.");
      return;
    }
    if (calculatedDays <= 0) {
      setError("Selected dates only cover weekend days.");
      return;
    }
    if (!reason.trim() || reason.trim().length < 3) {
      setError("Please provide a reason (minimum 3 characters).");
      return;
    }

    startTransition(async () => {
      const res = await submitLeaveRequestAction({
        employeeId: selectedEmployeeId,
        leaveType,
        startDate,
        endDate,
        days: calculatedDays,
        reason: reason.trim(),
        isPaid,
      });

      if (res.error) {
        setError(res.error);
      } else {
        onSuccess?.();
        onClose();
        setReason("");
        setStartDate("");
        setEndDate("");
      }
    });
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-xs">
        <div
          className="relative w-full max-w-lg rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-6 shadow-2xl transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
                Submit Leave Request
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                Weekends are automatically excluded from the computed duration.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-full p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2.5 rounded-[var(--radius-control)] border border-[var(--color-status-error)]/30 bg-[var(--color-status-error-bg)] p-3 text-xs text-[var(--color-status-error)]">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Employee Selector */}
            <div>
              <label className="block text-xs font-bold text-[var(--color-text-primary)] mb-1">
                Employee
              </label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                disabled={isPending}
                className="w-full min-h-[44px] rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] px-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-action-primary)] focus:ring-1 focus:ring-[var(--color-action-primary)]"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.departmentName} — {emp.jobTitle})
                  </option>
                ))}
              </select>
              {activeTargetEmployee && (
                <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
                  Annual allowance: {activeTargetEmployee.leaveAllowance} days
                </p>
              )}
            </div>

            {/* Leave Type Grid */}
            <div>
              <label className="block text-xs font-bold text-[var(--color-text-primary)] mb-1.5">
                Leave Category
              </label>
              <div className="grid grid-cols-2 gap-2">
                {LEAVE_TYPES.map((lt) => {
                  const isSelected = leaveType === lt.type;
                  return (
                    <button
                      key={lt.type}
                      type="button"
                      onClick={() => handleLeaveTypeChange(lt.type)}
                      className={`flex flex-col items-start p-2.5 rounded-[var(--radius-control)] border text-left transition-all ${
                        isSelected
                          ? "border-[var(--color-action-primary)] bg-[var(--color-action-primary)]/10 font-bold text-[var(--color-text-primary)] ring-1 ring-[var(--color-action-primary)]"
                          : "border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)]/40 hover:border-[var(--color-border-control)] text-[var(--color-text-secondary)]"
                      }`}
                    >
                      <span className="text-xs">{lt.label}</span>
                      <span className="text-[10px] text-[var(--color-text-secondary)] font-normal line-clamp-1">
                        {lt.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dates: Start & End */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[var(--color-text-primary)] mb-1">
                  Start Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    disabled={isPending}
                    className="w-full min-h-[44px] rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] px-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-action-primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-text-primary)] mb-1">
                  End Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    disabled={isPending}
                    className="w-full min-h-[44px] rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] px-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-action-primary)]"
                  />
                </div>
              </div>
            </div>

            {/* Live Day Computation Banner */}
            {calculatedDays > 0 && (
              <div className="flex items-center justify-between rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)] p-3 text-xs">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[var(--color-action-on-primary)]" />
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    Calculated Duration:
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-[var(--color-text-primary)]">
                    {calculatedDays} working day{calculatedDays > 1 ? "s" : ""}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      isPaid
                        ? "bg-[var(--color-status-success-bg)] text-[var(--color-status-success)]"
                        : "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)] border border-[var(--color-warning-border)]"
                    }`}
                  >
                    {isPaid ? "Paid Leave" : "Unpaid (Payroll Deduction)"}
                  </span>
                </div>
              </div>
            )}

            {/* Paid / Unpaid Toggle (Editable for special circumstances) */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isPaidCheckbox"
                checked={isPaid}
                onChange={(e) => setIsPaid(e.target.checked)}
                disabled={isPending || leaveType === "unpaid"}
                className="h-4 w-4 rounded border-gray-300 text-[var(--color-action-primary)] focus:ring-[var(--color-action-primary)]"
              />
              <label
                htmlFor="isPaidCheckbox"
                className="text-xs text-[var(--color-text-primary)] cursor-pointer select-none"
              >
                Mark as Paid Leave (uncheck to apply unpaid leave salary deduction)
              </label>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-bold text-[var(--color-text-primary)] mb-1">
                Reason / Details
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Brief description of the reason for absence..."
                rows={3}
                required
                disabled={isPending}
                className="w-full rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] p-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-action-primary)]"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-[var(--color-border-subtle)] pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="min-h-[44px] rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] px-4 text-xs font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex min-h-[44px] items-center gap-2 rounded-[var(--radius-control)] bg-[var(--color-action-primary)] px-6 text-xs font-bold text-[var(--color-action-on-primary)] hover:bg-[var(--color-action-hover)] transition-colors disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Submit Request</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}
