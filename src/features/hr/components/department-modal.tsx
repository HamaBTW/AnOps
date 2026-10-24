"use client";

import { useState, useTransition } from "react";
import { X, Plus, Building2, Loader2, Users } from "lucide-react";
import type { Department } from "@/features/hr/types";
import { createDepartmentAction } from "@/features/hr/actions/department.action";

type DepartmentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  departments: Department[];
  onRefresh?: () => void;
};

export function DepartmentModal({
  isOpen,
  onClose,
  departments,
  onRefresh,
}: DepartmentModalProps) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter a department name.");
      return;
    }

    startTransition(async () => {
      const res = await createDepartmentAction(trimmed, description.trim() || undefined);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(`Department "${trimmed}" created.`);
        setName("");
        setDescription("");
        onRefresh?.();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg max-h-[85vh] flex flex-col rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)] bg-[var(--color-action-primary)] text-[var(--color-action-on-primary)] font-bold">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
                Departments
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {departments.length} active business units
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-[var(--radius-control)] border border-[var(--color-status-error)]/30 bg-[var(--color-status-error-bg)] p-3 text-xs text-[var(--color-status-error)] font-medium">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-3 rounded-[var(--radius-control)] border border-[var(--color-status-success)]/30 bg-[var(--color-status-success-bg)] p-3 text-xs text-[var(--color-status-success)] font-medium">
            {success}
          </div>
        )}

        {/* Add department form */}
        <form onSubmit={handleCreate} className="mt-4 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-canvas)] p-3.5 space-y-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
            Create Department
          </p>
          <div className="space-y-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Department Name (e.g. Legal & Compliance)"
              className="w-full min-h-[40px] rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] px-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]"
            />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description (optional)"
              className="w-full min-h-[40px] rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-3 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none"
            />
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isPending || !name.trim()}
              className="flex min-h-[38px] items-center gap-1.5 rounded-[var(--radius-control)] bg-[var(--color-action-primary)] px-4 text-xs font-bold text-[var(--color-action-on-primary)] hover:bg-[var(--color-action-hover)] disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Add Department
            </button>
          </div>
        </form>

        {/* List */}
        <div className="mt-4 flex-1 overflow-y-auto space-y-2 max-h-64 pr-1">
          {departments.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-3 text-sm"
            >
              <div>
                <p className="font-semibold text-[var(--color-text-primary)]">{d.name}</p>
                {d.description && (
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 line-clamp-1">
                    {d.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-[var(--color-bg-subtle)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text-secondary)]">
                <Users className="h-3.5 w-3.5" />
                <span>{d.employeeCount ?? 0}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-[var(--color-border-subtle)] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] rounded-[var(--radius-control)] bg-[var(--color-bg-subtle)] px-5 text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-border-subtle)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
