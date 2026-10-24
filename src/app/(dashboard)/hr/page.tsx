"use client"

import { useEffect, useState } from "react"
import { useActionState } from "react"
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/components/ui/button"
import { AlertCircle, CheckCircle, RefreshCw, Search, Edit, Trash2, MoreHorizontal } from "lucide-react"

import type { Employee } from "@/features/hr/schemas/employee.schema"
import { listEmployeesAction } from "@/features/hr/actions/employees.action"
import { createEmployeeAction } from "@/features/hr/actions/employees.action"
import { deactivateEmployeeAction } from "@/features/hr/actions/employees.action"

type FormResult = { error?: string; success?: string }

export default function HrPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const [ createState, createFormAction ] = useActionState(createEmployeeAction, {
    error: undefined,
    success: undefined,
  } as FormResult)

  const [ deactivateState, deactivateFormAction ] = useActionState(deactivateEmployeeAction, {
    error: undefined,
    success: undefined,
  } as FormResult)

  async function loadEmployees() {
    try {
      const result = await listEmployeesAction()
      setEmployees(result)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadEmployees() }, [])

  useEffect(() => {
    if (createState?.success || deactivateState?.success) loadEmployees()
  }, [createState, deactivateState])

  const filteredEmployees = employees.filter((emp) =>
    emp.name.toLowerCase().includes(search.toLowerCase()) ||
    emp.email.toLowerCase().includes(search.toLowerCase()) ||
    emp.jobTitle.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Employees</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Manage your organization workforce
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => loadEmployees()} className="min-h-[44px]">
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Status Messages */}
      {(createState?.error || deactivateState?.error) && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{createState?.error || deactivateState?.error}</span>
        </div>
      )}
      {(createState?.success || deactivateState?.success) && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          <span>{createState?.success || deactivateState?.success}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-muted-foreground)]" />
        <input
          type="search"
          placeholder="Search employees..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 pl-9 pr-3 rounded-md border border-[var(--color-input)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
        />
      </div>

      {/* Employee Table */}
      <div className="rounded-md border border-[var(--color-border)] overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[var(--color-muted)]/50 border-b border-[var(--color-border)]">
            <tr>
              <th className="px-4 py-3 text-sm font-medium text-[var(--color-text-primary)]">Name</th>
              <th className="px-4 py-3 text-sm font-medium text-[var(--color-text-primary)]">Email</th>
              <th className="px-4 py-3 text-sm font-medium text-[var(--color-text-primary)]">Job Title</th>
              <th className="px-4 py-3 text-sm font-medium text-[var(--color-text-primary)]">Status</th>
              <th className="px-4 py-3 text-sm font-medium text-[var(--color-text-primary)]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && employees.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[var(--color-muted-foreground)]">
                  Loading employees...
                </td>
              </tr>
            ) : filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[var(--color-muted-foreground)]">
                  No employees found.
                </td>
              </tr>
            ) : (
              filteredEmployees.map((emp) => (
                <tr
                  key={emp._id}
                  className="border-b border-[var(--color-border)] hover:bg-[var(--color-muted)]/50 transition-colors"
                >
                  <td className="px-4 py-3 text-[var(--color-text-primary)] font-medium">{emp.name}</td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{emp.email}</td>
                  <td className="px-4 py-3 text-[var(--color-text-primary)]">{emp.jobTitle}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex px-2 py-1 rounded-full text-xs font-medium",
                        emp.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      )}
                    >
                      {emp.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="min-h-[44px] min-w-[44px] px-2 h-auto">
                        <Edit className="h-4 w-4 text-[var(--color-text-secondary)]" />
                      </Button>
                      <form action={deactivateFormAction}>
                        <input type="hidden" name="id" value={emp._id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          className="min-h-[44px] min-w-[44px] px-2 h-auto"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Employee Form */}
      <div className="mt-12 pt-8 border-t border-[var(--color-border)]">
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-6">Add New Employee</h2>
        <form action={createFormAction} className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-text-primary)]">
              Name
            </label>
            <input
              name="name"
              type="text"
              required
              className="w-full h-10 px-3 border border-[var(--color-input)] rounded-md bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-text-primary)]">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              className="w-full h-10 px-3 border border-[var(--color-input)] rounded-md bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-text-primary)]">
              Job Title
            </label>
            <input
              name="jobTitle"
              type="text"
              required
              className="w-full h-10 px-3 border border-[var(--color-input)] rounded-md bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-text-primary)]">
              Base Salary
            </label>
            <input
              name="baseSalary"
              type="number"
              required
              className="w-full h-10 px-3 border border-[var(--color-input)] rounded-md bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-text-primary)]">
              Role
            </label>
            <select
              name="role"
              required
              className="w-full h-10 px-3 border border-[var(--color-input)] rounded-md bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
            >
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-text-primary)]">
              Status
            </label>
            <select
              name="status"
              required
              className="w-full h-10 px-3 border border-[var(--color-input)] rounded-md bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <Button type="submit" className="w-full h-12 min-h-[44px]">
              Create Employee
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
