"use client";

import { useState, useTransition } from "react";
import { X, Plus, Trash2, Briefcase, Search, Loader2, ShieldCheck, Tag } from "lucide-react";
import type { JobTitle, Department } from "@/features/hr/types";
import { createJobTitleAction, deleteJobTitleAction } from "@/features/hr/actions/job-title.action";

type JobTitlesModalProps = {
  isOpen: boolean;
  onClose: () => void;
  jobTitles: JobTitle[];
  departments: Department[];
  onRefresh?: () => void;
};

export function JobTitlesModal({
  isOpen,
  onClose,
  jobTitles,
  departments,
  onRefresh,
}: JobTitlesModalProps) {
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredTitles = jobTitles.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  const predefinedCount = jobTitles.filter((t) => t.isPredefined).length;
  const customCount = jobTitles.filter((t) => !t.isPredefined).length;

  const handleAddTitle = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmed = newTitle.trim();
    if (!trimmed) {
      setError("Please enter a job title.");
      return;
    }

    startTransition(async () => {
      const res = await createJobTitleAction(trimmed, selectedDeptId || undefined);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(`"${trimmed}" was added to job titles.`);
        setNewTitle("");
        setSelectedDeptId("");
        onRefresh?.();
      }
    });
  };

  const handleDelete = (id: string, title: string) => {
    if (!confirm(`Are you sure you want to remove the job title "${title}"?`)) {
      return;
    }
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const res = await deleteJobTitleAction(id);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(`Job title "${title}" deleted.`);
        onRefresh?.();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl max-h-[85vh] flex flex-col rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)] bg-[var(--color-action-primary)] text-[var(--color-action-on-primary)] font-bold">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
                Job Title Management
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {predefinedCount} predefined standard titles · {customCount} custom titles
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

        {/* Add New Job Title Form */}
        <form onSubmit={handleAddTitle} className="mt-4 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-canvas)] p-3.5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
            Add New Job Title
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. AI Workflow Specialist"
                className="w-full min-h-[40px] rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] px-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]"
              />
            </div>
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="min-h-[40px] rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] px-3 text-xs text-[var(--color-text-primary)] focus:outline-none"
            >
              <option value="">Department (Optional)</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={isPending || !newTitle.trim()}
              className="flex min-h-[40px] shrink-0 items-center justify-center gap-1.5 rounded-[var(--radius-control)] bg-[var(--color-action-primary)] px-4 text-xs font-bold text-[var(--color-action-on-primary)] hover:bg-[var(--color-action-hover)] disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Save Title
            </button>
          </div>
        </form>

        {/* Search */}
        <div className="mt-4 relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search job titles..."
            className="w-full min-h-[40px] rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-3 pl-9 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-focus-ring)]"
          />
          <Search className="absolute left-3 top-3 h-4 w-4 text-[var(--color-text-secondary)]" />
        </div>

        {/* Titles List */}
        <div className="mt-3 flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-72">
          {filteredTitles.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-3.5 py-2.5 text-sm transition-colors hover:border-[var(--color-border-control)]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="font-medium text-[var(--color-text-primary)] truncate">
                  {item.title}
                </span>
                {item.isPredefined ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-bg-subtle)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-secondary)] shrink-0">
                    <ShieldCheck className="h-3 w-3" /> Predefined
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#fbf2da] px-2 py-0.5 text-[10px] font-semibold text-[#7b5915] shrink-0">
                    <Tag className="h-3 w-3" /> Custom
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-[var(--color-text-secondary)]">
                  {item.employeeCount ?? 0} {item.employeeCount === 1 ? "staff" : "staff"}
                </span>

                {!item.isPredefined && (
                  <button
                    type="button"
                    title={
                      (item.employeeCount ?? 0) > 0
                        ? "Cannot delete title while assigned to employees"
                        : "Delete custom title"
                    }
                    disabled={(item.employeeCount ?? 0) > 0 || isPending}
                    onClick={() => handleDelete(item.id, item.title)}
                    className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-status-error)] hover:bg-[var(--color-status-error-bg)] disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {filteredTitles.length === 0 && (
            <div className="py-8 text-center text-xs text-[var(--color-text-secondary)]">
              No matching job titles found.
            </div>
          )}
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
