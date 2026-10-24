"use client"

import { useEffect, useState } from "react"
import { useActionState } from "react"
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card"
import { AlertCircle, CheckCircle, RefreshCw, Search, UserPlus, X, Edit, Trash2 } from "lucide-react"

import type { Employee } from "@/features/hr/schemas/employee.schema"
import { listEmployeesAction } from "@/features/hr/actions/employees.action"
import { createEmployeeAction } from "@/features/hr/actions/employees.action"
import { deactivateEmployeeAction } from "@/features/hr/actions/employees.action"

type FormResult = { error?: string; success?: string }

export default function HrPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)

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

  function handleCancel() {
    setShowForm(false)
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
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">Employees</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Manage your organization workforce
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => loadEmployees()}
          className="min-h-[44px] gap-2"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Status Messages */}
      {(createState?.error || deactivateState?.error) && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{createState?.error || deactivateState?.error}</span>
        </div>
      )}
      {(createState?.success || deactivateState?.success) && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          <span>{createState?.success || deactivateState?.success}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative max-w-xl w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-muted-foreground)]" />
        <input
          type="search"
          placeholder="Search by name, email, or title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 pl-9 pr-3 rounded-lg border border-[var(--color-input)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:border-transparent transition-all duration-200 w-full"
        />
      </div>

      {/* Employee Table */}
      <Card className="border-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[var(--color-muted)]/50 border-b border-[var(--color-border)] sticky top-0">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Name</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Email</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Job Title</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Role</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Salary</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Status</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]" style={{ width: "160px" }}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {loading && employees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[var(--color-muted-foreground)]">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                      <span className="text-sm text-[var(--color-muted-foreground)]">Loading employees...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr className="min-h-20">
                  <td colSpan={7} className="px-4 py-8 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <UserPlus className="h-10 w-10 text-[var(--color-muted-foreground)]" />
                      <span className="text-sm text-[var(--color-muted-foreground)]">No employees found</span>
                      {search ? (
                        <p className="text-xs text-[var(--color-muted-foreground)]">Try adjusting your search</p>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : filteredEmployees.map((emp) => (
                <tr
                  key={emp._id}
                  className="border-b divide-y divide-[var(--color-border)] hover:bg-[var(--color-muted)]/30 transition-colors cursor-pointer"
                  style={{ cursor: "pointer" }}
                >
                  <td className="px-4 py-4 whitespace-nowrap font-medium text-[var(--color-text-primary)]">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        {emp.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                      </div>
                      <span className="font-medium">{emp.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--color-text-primary)]">
                    {emp.email}
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--color-text-primary)]">
                    {emp.jobTitle}
                  </td>
                  <td className="px-4 py-4 text-sm font-medium">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                      emp.role === "admin"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-blue-100 text-blue-800"
                    )}>
                      {emp.role}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--color-text-primary)]">
                    ${emp.baseSalary.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-sm font-medium">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                      emp.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    )}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="group hover:bg-blue-100 hover:text-blue-600 hover:text-blue-700 transition-colors duration-150"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4 text-blue-500 group-hover:text-blue-600" />
                      </Button>
                      <form action={deactivateFormAction} className="inline">
                        <input type="hidden" name="id" value={emp._id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          className="group hover:bg-red-100 hover:text-red-600 hover:text-red-700 transition-colors duration-150"
                          title={emp.status === "active" ? "Deactivate" : "Activate"}
                        >
                          <Trash2 className="h-4 w-4 text-red-500 group-hover:text-red-600" />
                        </Button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Employee Form - Slide down panel */}
      <div className={cn(
        "transition-all duration-300 ease-in-out",
        showForm
          ? "opacity-100 translate-y-0 max-h-[1000px] pb-6"
          : "opacity-0 translate-y-[-20px] max-h-0 pb-0 overflow-hidden"
      )}>
        <Card variant="filled" className="border-0">
          <CardHeader className="flex flex-row items-center justify-between p-6">
            <div>
              <CardTitle className="text-xl">Add New Employee</CardTitle>
              <CardDescription>Fill in the details below to create a new employee record</CardDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowForm(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="pb-6">
            <form action={createFormAction} className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[var(--color-text-primary)]">
                  Full Name
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="John Doe"
                  className="w-full h-10 px-3 rounded-lg border border-[var(--color-input)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:border-transparent transition-all duration-200"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[var(--color-text-primary)]">
                  Email Address
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="john@company.com"
                  className="w-full h-10 px-3 rounded-lg border border-[var(--color-input)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:border-transparent transition-all duration-200"
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
                  placeholder="Senior Software Engineer"
                  className="w-full h-10 px-3 rounded-lg border border-[var(--color-input)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:border-transparent transition-all duration-200"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[var(--color-text-primary)]">
                  Base Salary ($)
                </label>
                <input
                  name="baseSalary"
                  type="number"
                  required
                  min="0"
                  step="100"
                  placeholder="75000"
                  className="w-full h-10 px-3 rounded-lg border border-[var(--color-input)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:border-transparent transition-all duration-200"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[var(--color-text-primary)]">
                  Role
                </label>
                <select
                  name="role"
                  required
                  className="w-full h-10 px-3 rounded-lg border border-[var(--color-input)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:border-transparent transition-all duration-200 appearance-none cursor-pointer"
                >
                  <option value="employee">Employee</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[var(--color-text-primary)]">
                  Status
                </label>
                <select
                  name="status"
                  required
                  className="w-full h-10 px-3 rounded-lg border border-[var(--color-input)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:border-transparent transition-all duration-200 appearance-none cursor-pointer"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="sm:col-span-2 flex gap-3 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => handleCancel()}
                  className="flex-1 min-h-[48px] justify-center text-sm"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="lg"
                  className="flex-1 min-h-[48px] justify-center text-sm shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                >
                  <UserPlus className="h-4 w-4 mr-2 align-middle" />
                  <span className="align-middle">Create Employee</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Add Employee Trigger */}
      {!showForm && (
        <Card className="border-0">
          <CardContent className="pt-6 text-center">
            <Button
              variant="secondary"
              size="lg"
              className="w-full min-h-[52px] gap-2"
              onClick={() => setShowForm(true)}
            >
              <UserPlus className="h-5 w-5" />
              <span className="ml-2">Add New Employee</span>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}