"use client";

import { useState, useTransition, useEffect } from "react";
import { X, Loader2, User, Mail, Phone, Calendar, DollarSign, Shield } from "lucide-react";
import type { Department, JobTitle, Employee } from "@/features/hr/types";
import { useScrollLock } from "@/shared/hooks/use-scroll-lock";
import { JobTitleCombobox } from "./job-title-combobox";
import { createEmployeeAction, updateEmployeeAction } from "@/features/hr/actions/employee.action";

type EmployeeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  departments: Department[];
  jobTitles: JobTitle[];
  employeeToEdit?: Employee | null;
  onSuccess?: () => void;
};

export function EmployeeModal({
  isOpen,
  onClose,
  departments,
  jobTitles,
  employeeToEdit,
  onSuccess,
}: EmployeeModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [isCustomJobTitle, setIsCustomJobTitle] = useState(false);
  const [hireDate, setHireDate] = useState("");
  const [baseSalary, setBaseSalary] = useState<number | "">(3500);
  const [role, setRole] = useState<"employee" | "manager" | "hr_admin">("employee");
  const [status, setStatus] = useState<"active" | "inactive">("active");

  const isEditing = Boolean(employeeToEdit);

  useScrollLock(isOpen);

  useEffect(() => {
    if (employeeToEdit) {
      setFullName(employeeToEdit.fullName);
      setEmail(employeeToEdit.email);
      setPhone(employeeToEdit.phone || "");
      setDepartmentId(employeeToEdit.departmentId);
      setJobTitle(employeeToEdit.jobTitle);
      setHireDate(employeeToEdit.hireDate);
      setBaseSalary(employeeToEdit.baseSalary);
      setRole(employeeToEdit.role);
      setStatus(employeeToEdit.status);
    } else {
      setFullName("");
      setEmail("");
      setPhone("");
      setDepartmentId(departments[0]?.id || "");
      setJobTitle(jobTitles[0]?.title || "");
      setIsCustomJobTitle(false);
      setHireDate(new Date().toISOString().split("T")[0]);
      setBaseSalary(3200);
      setRole("employee");
      setStatus("active");
    }
    setError(null);
  }, [employeeToEdit, departments, jobTitles, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError("Please enter the employee's full name.");
      return;
    }
    if (!email.trim()) {
      setError("Please enter a valid work email.");
      return;
    }
    if (!departmentId) {
      setError("Please select a department.");
      return;
    }
    if (!jobTitle.trim()) {
      setError("Please select or enter a job title.");
      return;
    }
    if (baseSalary === "" || Number(baseSalary) < 0) {
      setError("Please enter a valid base salary (0 or greater).");
      return;
    }

    const payload = {
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() || undefined,
      departmentId,
      jobTitle: jobTitle.trim(),
      isCustomJobTitle,
      hireDate,
      baseSalary: Number(baseSalary),
      role,
      status,
      leaveAllowance: 25,
    };

    startTransition(async () => {
      const result = isEditing && employeeToEdit
        ? await updateEmployeeAction(employeeToEdit.id, payload)
        : await createEmployeeAction(payload);

      if (result.error) {
        setError(result.error);
      } else {
        onSuccess?.();
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
              {isEditing ? "Edit Employee Profile" : "Add New Employee"}
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              {isEditing
                ? "Update staff contact details, department, title, or compensation"
                : "Create a new employee profile and define role and job title"}
            </p>
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
          <div className="mt-4 rounded-[var(--radius-control)] border border-[var(--color-status-error)]/30 bg-[var(--color-status-error-bg)] p-3 text-xs text-[var(--color-status-error)] font-medium">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
                Full Name <span className="text-[var(--color-status-error)]">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Leila Ammar"
                  className="w-full min-h-[44px] rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] px-3.5 py-2 pl-10 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]"
                />
                <User className="absolute left-3 top-3.5 h-4 w-4 text-[var(--color-text-secondary)]" />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
                Work Email <span className="text-[var(--color-status-error)]">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. leila.ammar@anops.internal"
                  className="w-full min-h-[44px] rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] px-3.5 py-2 pl-10 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]"
                />
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-[var(--color-text-secondary)]" />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
                Phone Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +216 20 555 777"
                  className="w-full min-h-[44px] rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] px-3.5 py-2 pl-10 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]"
                />
                <Phone className="absolute left-3 top-3.5 h-4 w-4 text-[var(--color-text-secondary)]" />
              </div>
            </div>

            {/* Department */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
                Department <span className="text-[var(--color-status-error)]">*</span>
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                required
                className="w-full min-h-[44px] rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] px-3.5 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]"
              >
                <option value="" disabled>
                  Select Department...
                </option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Job Title Selector (Predefined or Custom) */}
          <div className="pt-1">
            <JobTitleCombobox
              jobTitles={jobTitles}
              value={jobTitle}
              onChange={(newTitle, isCustom) => {
                setJobTitle(newTitle);
                setIsCustomJobTitle(isCustom);
              }}
              selectedDepartmentId={departmentId}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-1">
            {/* Base Salary */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
                Base Monthly Salary <span className="text-[var(--color-status-error)]">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="50"
                  required
                  value={baseSalary}
                  onChange={(e) => setBaseSalary(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="3500"
                  className="w-full min-h-[44px] rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] px-3.5 py-2 pl-9 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]"
                />
                <DollarSign className="absolute left-3 top-3.5 h-4 w-4 text-[var(--color-text-secondary)]" />
              </div>
            </div>

            {/* Hire Date */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
                Hire Date <span className="text-[var(--color-status-error)]">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={hireDate}
                  onChange={(e) => setHireDate(e.target.value)}
                  className="w-full min-h-[44px] rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] px-3.5 py-2 pl-10 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]"
                />
                <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-[var(--color-text-secondary)]" />
              </div>
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
                System Role
              </label>
              <div className="relative">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as "employee" | "manager" | "hr_admin")}
                  className="w-full min-h-[44px] rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] px-3.5 py-2 pl-9 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]"
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Team Lead / Manager</option>
                  <option value="hr_admin">HR Administrator</option>
                </select>
                <Shield className="absolute left-3 top-3.5 h-4 w-4 text-[var(--color-text-secondary)]" />
              </div>
            </div>
          </div>

          {/* Status radio / toggle */}
          <div className="rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-canvas)] p-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[var(--color-text-primary)]">Employment Status</p>
              <p className="text-[11px] text-[var(--color-text-secondary)]">
                Inactive employees cannot request leave or receive monthly payroll.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStatus("active")}
                className={`min-h-[36px] rounded-[var(--radius-pill)] px-3 py-1 text-xs font-semibold transition-colors ${
                  status === "active"
                    ? "bg-[#176247] text-white"
                    : "bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]"
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setStatus("inactive")}
                className={`min-h-[36px] rounded-[var(--radius-pill)] px-3 py-1 text-xs font-semibold transition-colors ${
                  status === "inactive"
                    ? "bg-[#a43434] text-white"
                    : "bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]"
                }`}
              >
                Inactive
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-border-subtle)]">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="min-h-[44px] rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-5 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--color-action-primary)] px-6 text-sm font-bold text-[var(--color-action-on-primary)] transition-colors hover:bg-[var(--color-action-hover)] disabled:opacity-50"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Create Employee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
