"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, textareaClass } from "@/shared/components/ui/button";
import { TextField } from "@/shared/components/ui/text-field";
import { logRentalTimesheetAction } from "@/features/hr/actions/worker-rental.actions";
import type { WorkerRentalAgreement } from "@/features/hr/types/worker-rental.types";

export function TimesheetLogModal({
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

  const [workDate, setWorkDate] = useState(new Date().toISOString().slice(0, 10));
  const [unitsWorked, setUnitsWorked] = useState(agreement.rateType === "hourly" ? "8" : "1");
  const [overtimeHours, setOvertimeHours] = useState("0");
  const [taskDescription, setTaskDescription] = useState("");
  const [approvedBy, setApprovedBy] = useState(agreement.supervisorName || "");

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const units = Number(unitsWorked);
    if (!units || units <= 0) {
      setError("Please specify valid units (hours or days) worked.");
      return;
    }

    startTransition(async () => {
      const res = await logRentalTimesheetAction({
        agreementId: agreement.id,
        workDate,
        unitsWorked: units,
        overtimeHours: Number(overtimeHours) || 0,
        taskDescription,
        approvedBy,
      });

      if (res.error) {
        setError(res.error);
        return;
      }

      onClose();
      router.refresh();
    });
  }

  const unitLabel = agreement.rateType === "hourly" ? "Hours" : "Days";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-[var(--radius-card)] bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[var(--color-border-subtle)] pb-3">
          <div>
            <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
              Log Work & Timesheet
            </h3>
            <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
              Worker: <strong className="text-[var(--color-text-primary)]">{agreement.workerName}</strong> ({agreement.workerRole})
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
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Work Date *"
              type="date"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
            />
            <TextField
              label={`${unitLabel} Worked *`}
              type="number"
              step={agreement.rateType === "hourly" ? "0.5" : "0.25"}
              value={unitsWorked}
              onChange={(e) => setUnitsWorked(e.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Overtime Hours (Optional)"
              type="number"
              step="0.5"
              placeholder="0"
              value={overtimeHours}
              onChange={(e) => setOvertimeHours(e.target.value)}
            />
            <TextField
              label="Approved / Verified By"
              placeholder="Supervisor name"
              value={approvedBy}
              onChange={(e) => setApprovedBy(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--color-text-secondary)]">
              Work / Task Description
            </label>
            <textarea
              rows={2}
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="e.g. Completed PLC installation on line 3 and calibrated sensors..."
              className={textareaClass}
            />
          </div>

          <div className="p-3 rounded-[var(--radius-control)] bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] flex items-center justify-between text-xs">
            <span className="text-[var(--color-text-secondary)]">Contract Rate:</span>
            <span className="font-semibold text-[var(--color-text-primary)]">
              {agreement.unitRate} {agreement.currency} / {agreement.rateType}
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border-subtle)]">
            <Button variant="secondary" onClick={onClose} disabled={pending} className="text-xs">
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={pending} className="text-xs">
              {pending ? "Logging Hours..." : "Save Work Log"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

