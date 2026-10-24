"use client";

import { useState } from "react";
import { Plus, Briefcase, Building2, Sparkles, RefreshCw } from "lucide-react";
import type { Employee, Department, JobTitle, HRDashboardStats } from "@/features/hr/types";
import { HRStatsCards } from "./hr-stats-cards";
import { EmployeeTable } from "./employee-table";
import { EmployeeModal } from "./employee-modal";
import { JobTitlesModal } from "./job-titles-modal";
import { DepartmentModal } from "./department-modal";
import { useRouter } from "next/navigation";

type HRDashboardClientProps = {
  initialEmployees: Employee[];
  initialDepartments: Department[];
  initialJobTitles: JobTitle[];
  initialStats: HRDashboardStats;
};

export function HRDashboardClient({
  initialEmployees,
  initialDepartments,
  initialJobTitles,
  initialStats,
}: HRDashboardClientProps) {
  const router = useRouter();

  // Modal states
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [jobTitlesModalOpen, setJobTitlesModalOpen] = useState(false);
  const [departmentModalOpen, setDepartmentModalOpen] = useState(false);

  const handleOpenAddEmployee = () => {
    setEditingEmployee(null);
    setEmployeeModalOpen(true);
  };

  const handleEditEmployee = (emp: Employee) => {
    setEditingEmployee(emp);
    setEmployeeModalOpen(true);
  };

  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <div className="space-y-6 sm:space-y-8 reveal">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--color-text-primary)]">
              HR & Personnel
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-action-primary)]/20 px-2.5 py-0.5 text-xs font-bold text-[var(--color-text-primary)]">
              <Sparkles className="h-3 w-3" /> Core Module
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Employee profiles, predefined & custom job titles, departments, and payroll management
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Job Titles Management Button */}
          <button
            type="button"
            onClick={() => setJobTitlesModalOpen(true)}
            className="flex min-h-[44px] items-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-4 text-xs font-bold text-[var(--color-text-primary)] transition-all hover:border-[var(--color-border-control)] hover:bg-[var(--color-bg-subtle)] shadow-xs"
          >
            <Briefcase className="h-4 w-4 text-[var(--color-text-secondary)]" />
            <span>Job Titles</span>
            <span className="rounded-full bg-[var(--color-bg-subtle)] px-2 py-0.5 text-[10px] text-[var(--color-text-secondary)]">
              {initialJobTitles.length}
            </span>
          </button>

          {/* Departments Management Button */}
          <button
            type="button"
            onClick={() => setDepartmentModalOpen(true)}
            className="flex min-h-[44px] items-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-4 text-xs font-bold text-[var(--color-text-primary)] transition-all hover:border-[var(--color-border-control)] hover:bg-[var(--color-bg-subtle)] shadow-xs"
          >
            <Building2 className="h-4 w-4 text-[var(--color-text-secondary)]" />
            <span>Departments</span>
            <span className="rounded-full bg-[var(--color-bg-subtle)] px-2 py-0.5 text-[10px] text-[var(--color-text-secondary)]">
              {initialDepartments.length}
            </span>
          </button>

          {/* Add Employee CTA */}
          <button
            type="button"
            onClick={handleOpenAddEmployee}
            className="flex min-h-[44px] items-center gap-2 rounded-[var(--radius-control)] bg-[var(--color-action-primary)] px-5 text-xs font-bold text-[var(--color-action-on-primary)] transition-colors hover:bg-[var(--color-action-hover)] shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <HRStatsCards stats={initialStats} />

      {/* Directory Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
              Employee Directory
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Full roster of active and inactive team members
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            title="Refresh employee data"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Directory Table */}
        <EmployeeTable
          employees={initialEmployees}
          departments={initialDepartments}
          jobTitles={initialJobTitles}
          onEditEmployee={handleEditEmployee}
          onAddNewEmployee={handleOpenAddEmployee}
        />
      </section>

      {/* Modals */}
      <EmployeeModal
        isOpen={employeeModalOpen}
        onClose={() => setEmployeeModalOpen(false)}
        departments={initialDepartments}
        jobTitles={initialJobTitles}
        employeeToEdit={editingEmployee}
        onSuccess={handleRefresh}
      />

      <JobTitlesModal
        isOpen={jobTitlesModalOpen}
        onClose={() => setJobTitlesModalOpen(false)}
        jobTitles={initialJobTitles}
        departments={initialDepartments}
        onRefresh={handleRefresh}
      />

      <DepartmentModal
        isOpen={departmentModalOpen}
        onClose={() => setDepartmentModalOpen(false)}
        departments={initialDepartments}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
