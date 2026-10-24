"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";

import type { Employee } from "@/features/hr/schemas/employee.schema";

import { listEmployeesAction } from "@/features/hr/actions/employees.action";
import { createEmployeeAction } from "@/features/hr/actions/employees.action";
import { deactivateEmployeeAction } from "@/features/hr/actions/employees.action";

type FormResult = {
  error?: string;
  success?: string;
};

export default function HrPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [createState, createFormAction] = useActionState(createEmployeeAction, {
    error: undefined,
    success: undefined,
  } as FormResult);
  const [deactivateState, deactivateFormAction] = useActionState(deactivateEmployeeAction, {
    error: undefined,
    success: undefined,
  } as FormResult);

  async function loadEmployees() {
    try {
      const result = await listEmployeesAction();
      setEmployees(result);
    } catch {
      // handle error
    }
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    if (createState?.success || deactivateState?.success) {
      loadEmployees();
    }
  }, [createState, deactivateState]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Employees</h1>

      {(createState?.error || deactivateState?.error) && <div className="p-3 bg-red-100 border border-red-200 rounded text-sm text-red-700">{createState?.error || deactivateState?.error}</div>}
      {(createState?.success || deactivateState?.success) && (
        <div className="p-3 bg-green-100 border border-green-200 rounded text-sm text-green-700">
          {createState?.success || deactivateState?.success}
        </div>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Employee List</h2>
        </div>
        {employees.length === 0 ? (
          <p className="text-[var(--color-muted-foreground)]">No employees found.</p>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="px-4 py-2 text-sm font-medium text-[var(--color-text-primary)]">Name</th>
                <th className="px-4 py-2 text-sm font-medium text-[var(--color-text-primary)]">Job Title</th>
                <th className="px-4 py-2 text-sm font-medium text-[var(--color-text-primary)]">Status</th>
                <th className="px-4 py-2 text-sm font-medium text-[var(--color-text-primary)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp._id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-muted)]">
                  <td className="px-4 py-3 text-[var(--color-text-primary)]">{emp.name}</td>
                  <td className="px-4 py-3 text-[var(--color-text-primary)]">{emp.jobTitle}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${emp.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <form action={deactivateFormAction}>
                      <input type="hidden" name="id" value={emp._id} />
                      <button type="submit" className="text-xs bg-red-100 text-red-600 px-3 py-1 rounded hover:bg-red-200 min-h-[44px] px-3 py-1">
                        Deactivate
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Add New Employee</h2>
        <form action={createFormAction} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-text-primary)]">Name</label>
            <input name="name" type="text" required className="w-full h-10 px-3 border border-[var(--color-input)] rounded-md bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-text-primary)]">Email</label>
            <input name="email" type="email" required className="w-full h-10 px-3 border border-[var(--color-input)] rounded-md bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-text-primary)]">Job Title</label>
            <input name="jobTitle" type="text" required className="w-full h-10 px-3 border border-[var(--color-input)] rounded-md bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-text-primary)]">Base Salary</label>
            <input name="baseSalary" type="number" required className="w-full h-10 px-3 border border-[var(--color-input)] rounded-md bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-text-primary)]">Role</label>
            <select name="role" required className="w-full h-10 px-3 border border-[var(--color-input)] rounded-md bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]">
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-text-primary)]">Status</label>
            <select name="status" required className="w-full h-10 px-3 border border-[var(--color-input)] rounded-md bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <button type="submit" className="w-full h-10 px-4 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded-md hover:bg-[var(--color-primary)]/90 transition-colors min-h-[44px]">
            Create Employee
          </button>
        </form>
      </section>
    </div>
  );
}