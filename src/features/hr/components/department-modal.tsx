"use client";

import { useState, useTransition } from "react";
import {
  X, Plus, Building2, Loader2, Users, Edit3, Trash2,
  ChevronRight, ChevronLeft, Save, AlertCircle, UserCheck, UserX,
} from "lucide-react";
import type { Department, Employee } from "@/features/hr/types";
import {
  createDepartmentAction,
  updateDepartmentAction,
  deleteDepartmentAction,
  fetchDepartmentStaffAction,
} from "@/features/hr/actions/department.action";
import { cn } from "@/shared/lib/utils";
import { useScrollLock } from "@/shared/hooks/use-scroll-lock";
import { Portal } from "@/shared/components/ui/portal";

type DepartmentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  departments: Department[];
  onRefresh?: () => void;
};

type View = "list" | "create" | "edit" | "staff";

export function DepartmentModal({
  isOpen,
  onClose,
  departments,
  onRefresh,
}: DepartmentModalProps) {
  useScrollLock(isOpen);

  const [isPending, startTransition] = useTransition();
  const [view, setView] = useState<View>("list");
  const [editTarget, setEditTarget] = useState<Department | null>(null);
  const [staffTarget, setStaffTarget] = useState<Department | null>(null);
  const [staffList, setStaffList] = useState<Employee[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setName("");
    setDescription("");
    setError(null);
    setSuccess(null);
  };

  const goToCreate = () => {
    resetForm();
    setView("create");
  };

  const goToEdit = (dept: Department) => {
    setEditTarget(dept);
    setName(dept.name);
    setDescription(dept.description ?? "");
    setError(null);
    setSuccess(null);
    setView("edit");
  };

  const goToStaff = async (dept: Department) => {
    setStaffTarget(dept);
    setLoadingStaff(true);
    setView("staff");
    const result = await fetchDepartmentStaffAction(dept.id);
    setStaffList(result.data ?? []);
    setLoadingStaff(false);
  };

  const goBack = () => {
    setView("list");
    resetForm();
    setEditTarget(null);
    setStaffTarget(null);
    setStaffList([]);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const trimmed = name.trim();
    if (!trimmed) { setError("Please enter a department name."); return; }

    startTransition(async () => {
      const res = await createDepartmentAction(trimmed, description.trim() || undefined);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(`Department "${trimmed}" created.`);
        onRefresh?.();
        setTimeout(goBack, 800);
      }
    });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setError(null);
    setSuccess(null);
    const trimmed = name.trim();
    if (!trimmed) { setError("Please enter a department name."); return; }

    startTransition(async () => {
      const res = await updateDepartmentAction(editTarget.id, trimmed, description.trim() || undefined);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(`Department renamed to "${trimmed}".`);
        onRefresh?.();
        setTimeout(goBack, 800);
      }
    });
  };

  const handleDelete = (dept: Department) => {
    if ((dept.employeeCount ?? 0) > 0) {
      setError(`Cannot delete "${dept.name}" — it has ${dept.employeeCount} employee(s). Reassign them first.`);
      return;
    }
    if (!confirm(`Permanently delete department "${dept.name}"? This cannot be undone.`)) return;
    setError(null);

    startTransition(async () => {
      const res = await deleteDepartmentAction(dept.id);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(`Department "${dept.name}" deleted.`);
        onRefresh?.();
      }
    });
  };

  // ─── Header helpers ──────────────────────────────────────────────────────────
  const titles: Record<View, string> = {
    list: "Departments",
    create: "Create Department",
    edit: `Edit: ${editTarget?.name ?? ""}`,
    staff: `Staff — ${staffTarget?.name ?? ""}`,
  };

  const subtitles: Record<View, string> = {
    list: `${departments.length} business unit${departments.length !== 1 ? "s" : ""}`,
    create: "Add a new business unit to the organisational chart",
    edit: "Rename or update the description of this department",
    staff: `${staffTarget?.employeeCount ?? 0} employee${(staffTarget?.employeeCount ?? 0) !== 1 ? "s" : ""} assigned`,
  };

  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
      >
      <div
        className="relative w-full max-w-lg max-h-[88vh] flex flex-col rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] shadow-2xl overflow-hidden"
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
              <Building2 className="h-5 w-5" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold tracking-tight text-[var(--color-text-primary)] truncate">
              {titles[view]}
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)]">{subtitles[view]}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] transition-colors shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Feedback banners ──────────────────────────────────────────────── */}
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

        {/* ── Content area ──────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">

          {/* LIST VIEW */}
          {view === "list" && (
            <>
              {departments.length === 0 && (
                <p className="py-8 text-center text-xs text-[var(--color-text-secondary)]">
                  No departments yet. Create one below.
                </p>
              )}
              {departments.map((d) => (
                <div
                  key={d.id}
                  className="group flex items-center gap-3 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-3 hover:border-[var(--color-border-control)] transition-colors"
                >
                  {/* Avatar */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-action-primary)]/20 text-xs font-bold text-[var(--color-text-primary)]">
                    {d.name.slice(0, 2).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[var(--color-text-primary)] truncate">{d.name}</p>
                    {d.description && (
                      <p className="text-[11px] text-[var(--color-text-secondary)] truncate mt-0.5">{d.description}</p>
                    )}
                  </div>

                  {/* Staff count badge */}
                  <button
                    type="button"
                    onClick={() => goToStaff(d)}
                    title="View staff in this department"
                    className="flex items-center gap-1.5 rounded-full bg-[var(--color-bg-subtle)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-border-subtle)] transition-colors"
                  >
                    <Users className="h-3.5 w-3.5" />
                    <span>{d.employeeCount ?? 0}</span>
                  </button>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => goToEdit(d)}
                      title="Edit department"
                      className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)] transition-colors"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(d)}
                      title={
                        (d.employeeCount ?? 0) > 0
                          ? `Cannot delete — ${d.employeeCount} employee(s) assigned`
                          : "Delete department"
                      }
                      disabled={(d.employeeCount ?? 0) > 0 || isPending}
                      className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-status-error)] hover:bg-[var(--color-status-error-bg)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Chevron to staff */}
                  <button
                    type="button"
                    onClick={() => goToStaff(d)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--color-text-secondary)]"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </>
          )}

          {/* CREATE VIEW */}
          {view === "create" && (
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                  Department Name <span className="text-[var(--color-status-error)]">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  placeholder="e.g. Legal & Compliance"
                  className="w-full min-h-[44px] rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] px-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                  Description <span className="text-[var(--color-text-secondary)] font-normal normal-case">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Brief description of this department's purpose..."
                  className="w-full rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none resize-none"
                />
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
                  disabled={isPending || !name.trim()}
                  className="flex min-h-[40px] items-center gap-1.5 rounded-[var(--radius-control)] bg-[var(--color-action-primary)] px-5 text-xs font-bold text-[var(--color-action-on-primary)] hover:bg-[var(--color-action-hover)] disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Create Department
                </button>
              </div>
            </form>
          )}

          {/* EDIT VIEW */}
          {view === "edit" && editTarget && (
            <form onSubmit={handleEdit} className="space-y-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                  Department Name <span className="text-[var(--color-status-error)]">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  className="w-full min-h-[44px] rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] px-3 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none resize-none"
                />
              </div>
              <div className="rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-canvas)] px-3 py-2.5 text-xs text-[var(--color-text-secondary)]">
                ⚠ Renaming will automatically update department name across all assigned employees.
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
                  disabled={isPending || !name.trim()}
                  className="flex min-h-[40px] items-center gap-1.5 rounded-[var(--radius-control)] bg-[var(--color-action-primary)] px-5 text-xs font-bold text-[var(--color-action-on-primary)] hover:bg-[var(--color-action-hover)] disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {/* STAFF VIEW */}
          {view === "staff" && (
            <>
              {loadingStaff && (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--color-text-secondary)]" />
                </div>
              )}
              {!loadingStaff && staffList.length === 0 && (
                <div className="py-10 text-center">
                  <Users className="mx-auto h-8 w-8 text-[var(--color-text-secondary)] mb-2" />
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">No employees assigned</p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    This department has no staff yet. Assign employees from the HR directory.
                  </p>
                </div>
              )}
              {!loadingStaff && staffList.map((emp) => {
                const initials = (() => {
                  const parts = emp.fullName.trim().split(/\s+/).filter(Boolean);
                  if (parts.length === 0) return "?";
                  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
                  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                })();

                return (
                  <div
                    key={emp.id}
                    className="flex items-center gap-3 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-3"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-action-primary)] text-xs font-bold text-[var(--color-action-on-primary)]">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-[var(--color-text-primary)] truncate">{emp.fullName}</p>
                      <p className="text-[11px] text-[var(--color-text-secondary)] truncate">{emp.jobTitle}</p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0",
                        emp.status === "active"
                          ? "bg-[#e9f2ea] text-[#176247]"
                          : "bg-[#fff1ee] text-[#a43434]"
                      )}
                    >
                      {emp.status === "active"
                        ? <UserCheck className="h-3 w-3" />
                        : <UserX className="h-3 w-3" />
                      }
                      {emp.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border-subtle)] px-5 py-3 shrink-0">
          {view === "list" ? (
            <>
              <span className="text-xs text-[var(--color-text-secondary)]">
                Hover a row to edit or delete it
              </span>
              <button
                type="button"
                onClick={goToCreate}
                className="flex min-h-[40px] items-center gap-1.5 rounded-[var(--radius-control)] bg-[var(--color-action-primary)] px-4 text-xs font-bold text-[var(--color-action-on-primary)] hover:bg-[var(--color-action-hover)]"
              >
                <Plus className="h-3.5 w-3.5" />
                New Department
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
  </Portal>
);
}
