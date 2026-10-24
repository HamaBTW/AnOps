"use client";

import { useState, useTransition } from "react";
import {
  X, Plus, Trash2, Briefcase, Search, Loader2,
  ShieldCheck, Tag, Edit3, Save, AlertCircle, ChevronLeft,
} from "lucide-react";
import type { JobTitle, Department } from "@/features/hr/types";
import {
  createJobTitleAction,
  updateJobTitleAction,
  deleteJobTitleAction,
} from "@/features/hr/actions/job-title.action";
import { cn } from "@/shared/lib/utils";
import { useScrollLock } from "@/shared/hooks/use-scroll-lock";

type JobTitlesModalProps = {
  isOpen: boolean;
  onClose: () => void;
  jobTitles: JobTitle[];
  departments: Department[];
  onRefresh?: () => void;
};

type View = "list" | "create" | "edit";
type FilterTab = "all" | "predefined" | "custom";

export function JobTitlesModal({
  isOpen,
  onClose,
  jobTitles,
  departments,
  onRefresh,
}: JobTitlesModalProps) {
  useScrollLock(isOpen);

  const [isPending, startTransition] = useTransition();
  const [view, setView] = useState<View>("list");
  const [editTarget, setEditTarget] = useState<JobTitle | null>(null);

  // List state
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [filterDeptId, setFilterDeptId] = useState("");

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDeptId, setFormDeptId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const predefinedCount = jobTitles.filter((t) => t.isPredefined).length;
  const customCount = jobTitles.filter((t) => !t.isPredefined).length;

  // Apply filters
  const filtered = jobTitles.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchesTab =
      filterTab === "all" ||
      (filterTab === "predefined" && t.isPredefined) ||
      (filterTab === "custom" && !t.isPredefined);
    const matchesDept = !filterDeptId || t.departmentId === filterDeptId;
    return matchesSearch && matchesTab && matchesDept;
  });

  const resetForm = () => {
    setFormTitle("");
    setFormDeptId("");
    setError(null);
    setSuccess(null);
  };

  const goToCreate = () => {
    resetForm();
    setView("create");
  };

  const goToEdit = (t: JobTitle) => {
    setEditTarget(t);
    setFormTitle(t.title);
    setFormDeptId(t.departmentId ?? "");
    setError(null);
    setSuccess(null);
    setView("edit");
  };

  const goBack = () => {
    setView("list");
    resetForm();
    setEditTarget(null);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const trimmed = formTitle.trim();
    if (!trimmed) { setError("Please enter a job title."); return; }

    startTransition(async () => {
      const res = await createJobTitleAction(trimmed, formDeptId || undefined);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(`"${trimmed}" added.`);
        onRefresh?.();
        setTimeout(goBack, 700);
      }
    });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setError(null);
    setSuccess(null);
    const trimmed = formTitle.trim();
    if (!trimmed) { setError("Please enter a job title."); return; }

    startTransition(async () => {
      const res = await updateJobTitleAction(editTarget.id, trimmed, formDeptId || undefined);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(`Renamed to "${trimmed}".`);
        onRefresh?.();
        setTimeout(goBack, 700);
      }
    });
  };

  const handleDelete = (item: JobTitle) => {
    if (!confirm(`Remove the job title "${item.title}"?`)) return;
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await deleteJobTitleAction(item.id);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(`"${item.title}" deleted.`);
        onRefresh?.();
      }
    });
  };

  const deptName = (id?: string) =>
    id ? (departments.find((d) => d.id === id)?.name ?? id) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 border-b border-[var(--color-border-subtle)] px-5 py-4 shrink-0">
          {view !== "list" && (
            <button
              type="button"
              onClick={goBack}
              className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          {view === "list" && (
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)] bg-[var(--color-action-primary)] text-[var(--color-action-on-primary)] shrink-0">
              <Briefcase className="h-5 w-5" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold tracking-tight text-[var(--color-text-primary)]">
              {view === "list" ? "Job Title Management" : view === "create" ? "Add Job Title" : `Edit: ${editTarget?.title ?? ""}`}
            </h2>
            {view === "list" && (
              <p className="text-xs text-[var(--color-text-secondary)]">
                {predefinedCount} predefined · {customCount} custom
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] transition-colors shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Feedback ──────────────────────────────────────────────────────── */}
        {error && (
          <div className="mx-5 mt-3 flex items-start gap-2 rounded-[var(--radius-control)] border border-[var(--color-status-error)]/30 bg-[var(--color-status-error-bg)] p-3 text-xs text-[var(--color-status-error)] font-medium shrink-0">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="mx-5 mt-3 rounded-[var(--radius-control)] border border-[var(--color-status-success)]/30 bg-[var(--color-status-success-bg)] p-3 text-xs text-[var(--color-status-success)] font-medium shrink-0">
            {success}
          </div>
        )}

        {/* ── List view controls ─────────────────────────────────────────────── */}
        {view === "list" && (
          <div className="px-5 pt-4 space-y-3 shrink-0">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search job titles..."
                className="w-full min-h-[40px] rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-canvas)] px-3 pl-9 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-focus-ring)]"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--color-text-secondary)]" />
            </div>

            {/* Filter tabs */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-canvas)] p-0.5">
                {(["all", "predefined", "custom"] as FilterTab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setFilterTab(tab)}
                    className={cn(
                      "min-h-[32px] rounded-[calc(var(--radius-control)-2px)] px-3 text-xs font-semibold capitalize transition-colors",
                      filterTab === tab
                        ? "bg-[var(--color-action-primary)] text-[var(--color-action-on-primary)]"
                        : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                    )}
                  >
                    {tab} {tab === "all" ? `(${jobTitles.length})` : tab === "predefined" ? `(${predefinedCount})` : `(${customCount})`}
                  </button>
                ))}
              </div>

              {/* Department filter */}
              <select
                value={filterDeptId}
                onChange={(e) => setFilterDeptId(e.target.value)}
                className="min-h-[36px] rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-2 text-xs text-[var(--color-text-primary)] focus:outline-none"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* ── Scrollable content ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-1.5">

          {/* LIST */}
          {view === "list" && (
            <>
              {filtered.length === 0 && (
                <div className="py-10 text-center text-xs text-[var(--color-text-secondary)]">
                  No matching job titles. Try adjusting the filters.
                </div>
              )}
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-center gap-3 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-3.5 py-2.5 hover:border-[var(--color-border-control)] transition-colors"
                >
                  {/* Badge */}
                  {item.isPredefined ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--color-bg-subtle)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-secondary)]">
                      <ShieldCheck className="h-3 w-3" /> Predefined
                    </span>
                  ) : (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#fbf2da] px-2 py-0.5 text-[10px] font-semibold text-[#7b5915]">
                      <Tag className="h-3 w-3" /> Custom
                    </span>
                  )}

                  {/* Title + department */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">{item.title}</p>
                    {deptName(item.departmentId) && (
                      <p className="text-[11px] text-[var(--color-text-secondary)]">{deptName(item.departmentId)}</p>
                    )}
                  </div>

                  {/* Staff count */}
                  <span className="text-xs text-[var(--color-text-secondary)] shrink-0">
                    {item.employeeCount ?? 0} staff
                  </span>

                  {/* Actions — shown on hover for custom, or just count for predefined */}
                  <div
                    className={cn(
                      "flex items-center gap-1 transition-opacity shrink-0",
                      item.isPredefined ? "opacity-0 pointer-events-none" : "opacity-0 group-hover:opacity-100"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => goToEdit(item)}
                      title="Edit job title"
                      className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)] transition-colors"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      title={
                        (item.employeeCount ?? 0) > 0
                          ? "Cannot delete — title is assigned to employees"
                          : "Delete job title"
                      }
                      disabled={(item.employeeCount ?? 0) > 0 || isPending}
                      className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-status-error)] hover:bg-[var(--color-status-error-bg)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* CREATE */}
          {view === "create" && (
            <form onSubmit={handleCreate} className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                  Job Title Name <span className="text-[var(--color-status-error)]">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  autoFocus
                  placeholder="e.g. AI Workflow Specialist"
                  className="w-full min-h-[44px] rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] px-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                  Associated Department <span className="text-[var(--color-text-secondary)] font-normal normal-case">(optional)</span>
                </label>
                <select
                  value={formDeptId}
                  onChange={(e) => setFormDeptId(e.target.value)}
                  className="w-full min-h-[44px] rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] px-3 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]"
                >
                  <option value="">No specific department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={goBack}
                  className="min-h-[40px] rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] px-4 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !formTitle.trim()}
                  className="flex min-h-[40px] items-center gap-1.5 rounded-[var(--radius-control)] bg-[var(--color-action-primary)] px-5 text-xs font-bold text-[var(--color-action-on-primary)] hover:bg-[var(--color-action-hover)] disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Add Title
                </button>
              </div>
            </form>
          )}

          {/* EDIT */}
          {view === "edit" && editTarget && (
            <form onSubmit={handleEdit} className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                  Job Title Name <span className="text-[var(--color-status-error)]">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  autoFocus
                  className="w-full min-h-[44px] rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] px-3 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                  Associated Department
                </label>
                <select
                  value={formDeptId}
                  onChange={(e) => setFormDeptId(e.target.value)}
                  className="w-full min-h-[44px] rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] px-3 text-sm text-[var(--color-text-primary)] focus:outline-none"
                >
                  <option value="">No specific department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              {(editTarget.employeeCount ?? 0) > 0 && (
                <div className="rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-canvas)] px-3 py-2.5 text-xs text-[var(--color-text-secondary)]">
                  ⚠ Renaming will automatically update {editTarget.employeeCount} employee record{(editTarget.employeeCount ?? 0) > 1 ? "s" : ""} assigned this title.
                </div>
              )}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={goBack}
                  className="min-h-[40px] rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] px-4 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !formTitle.trim()}
                  className="flex min-h-[40px] items-center gap-1.5 rounded-[var(--radius-control)] bg-[var(--color-action-primary)] px-5 text-xs font-bold text-[var(--color-action-on-primary)] hover:bg-[var(--color-action-hover)] disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save Changes
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border-subtle)] px-5 py-3 shrink-0">
          {view === "list" ? (
            <>
              <span className="text-xs text-[var(--color-text-secondary)]">
                Hover a custom title to edit or delete it
              </span>
              <button
                type="button"
                onClick={goToCreate}
                className="flex min-h-[40px] items-center gap-1.5 rounded-[var(--radius-control)] bg-[var(--color-action-primary)] px-4 text-xs font-bold text-[var(--color-action-on-primary)] hover:bg-[var(--color-action-hover)]"
              >
                <Plus className="h-3.5 w-3.5" />
                New Title
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={goBack}
              className="min-h-[40px] rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] px-5 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]"
            >
              ← Back to list
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
