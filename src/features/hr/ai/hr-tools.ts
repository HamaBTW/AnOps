import "server-only";

import { z } from "zod";
import {
  assessLeaveRequest,
  calculateEmployeePayrollPreview,
  getEmployeeById,
  getEmployees,
  getLeaveRequests,
  getLeaveTransactions,
  getPublicHolidays,
  getSoldeDeConge,
  getTodayAttendance,
} from "@/server/services/hr.service";
import {
  cancellationBlocker,
  createPendingAction,
  type LeaveDraftPayload,
} from "@/server/services/hr-ai.service";
import { formatDateYMD } from "@/features/hr/utils/date-utils";
import type { LeaveRequest } from "@/features/hr/types";
import { searchPolicies } from "@/features/hr/ai/policy-search";
import { defineTool, type HrTool, type ToolContext, type ToolResult } from "@/features/hr/ai/tool-registry";

const ALL_ROLES = ["employee", "manager", "hr_admin"] as const;
const ADMIN_ONLY = ["hr_admin"] as const;

const LIST_LIMIT = 25;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use the YYYY-MM-DD format.").describe("YYYY-MM-DD");
const leaveTypeEnum = z.enum(["annual", "sick", "unpaid", "maternity_paternity", "bereavement", "other"]);
const halfDayEnum = z.enum(["morning", "afternoon"]);

const leaveDatesSchema = z.object({
  startDate: isoDate,
  endDate: isoDate,
  leaveType: leaveTypeEnum.describe("Use annual for Congés payés unless the user says otherwise."),
  halfDayOption: halfDayEnum.optional().describe("Only for a single half-day."),
});

function today(): string {
  return formatDateYMD(new Date());
}

function currentPeriod(): string {
  return today().slice(0, 7);
}

function overlaps(request: Pick<LeaveRequest, "startDate" | "endDate">, start: string, end: string): boolean {
  return request.startDate <= end && request.endDate >= start;
}

/** The fields of a request the model may see. Free-text reasons are left out on purpose. */
function requestSummary(r: LeaveRequest) {
  return {
    id: r.id,
    leaveType: r.leaveType,
    startDate: r.startDate,
    endDate: r.endDate,
    days: r.days,
    status: r.status,
    isPaid: r.isPaid,
  };
}

async function balanceData(employeeId: string, companyId: string) {
  const solde = await getSoldeDeConge(employeeId, new Date().getFullYear(), companyId);
  const transactions = await getLeaveTransactions({ employeeId }, companyId);
  return {
    solde,
    data: {
      employeeName: solde.employeeName,
      asOfDate: solde.asOfDate,
      earned: solde.earned,
      taken: solde.taken,
      reserved: solde.reserved,
      adjustments: solde.adjustments,
      available: solde.available,
      unpaidDaysTaken: solde.unpaidDaysTaken,
      unusedDaysIfLeavingToday: Math.max(0, solde.earned - solde.taken),
      policy: solde.policySummary ?? null,
      recentLedger: transactions.slice(0, 8).map((tx) => ({
        date: tx.effectiveDate,
        type: tx.transactionType,
        days: tx.days,
      })),
    },
  };
}

function balanceCard(data: Awaited<ReturnType<typeof balanceData>>["solde"]): Record<string, unknown> {
  return {
    employeeName: data.employeeName,
    earned: data.earned,
    taken: data.taken,
    reserved: data.reserved,
    adjustments: data.adjustments,
    available: data.available,
    policyName: data.policySummary?.name,
    legalReference: data.policySummary?.legalReference,
  };
}

/** Rules that apply only to AI-drafted requests: a mistaken date from the model must not become a real request. */
function draftDateErrors(startDate: string, endDate: string): string[] {
  const errors: string[] = [];
  if (Number.isNaN(Date.parse(startDate)) || Number.isNaN(Date.parse(endDate))) errors.push("Dates are not valid.");
  if (endDate < startDate) errors.push("End date must be on or after the start date.");
  if (startDate < today()) errors.push("Start date is in the past.");
  return errors;
}

const employeeTools: HrTool[] = [
  defineTool({
    name: "get_my_leave_balance",
    description: "The caller's own Solde de congé: earned, taken, reserved, adjustments, available, policy and recent ledger entries.",
    kind: "read",
    allowedRoles: ALL_ROLES,
    needsEmployee: true,
    parameters: z.object({}),
    handler: async (ctx) => {
      const { solde, data } = await balanceData(ctx.employeeId!, ctx.companyId);
      return { data, dataSource: "leave ledger", balanceCard: balanceCard(solde) };
    },
  }),
  defineTool({
    name: "get_my_leave_requests",
    description: "The caller's own leave requests and their statuses, newest first.",
    kind: "read",
    allowedRoles: ALL_ROLES,
    needsEmployee: true,
    parameters: z.object({
      status: z.enum(["pending", "approved", "rejected", "cancelled", "taken"]).optional(),
    }),
    handler: async (ctx, args) => {
      const requests = await getLeaveRequests({ employeeId: ctx.employeeId, status: args.status }, ctx.companyId);
      return {
        data: { total: requests.length, requests: requests.slice(0, LIST_LIMIT).map(requestSummary) },
        dataSource: "leave requests",
      };
    },
  }),
  defineTool({
    name: "get_my_payroll_preview",
    description: "The caller's own personal payroll for a month, only when they ask about their own pay (\"my salary\"). Saves nothing. Returns base salary, daily rate, unpaid leave deduction and net.",
    kind: "read",
    allowedRoles: ALL_ROLES,
    needsEmployee: true,
    parameters: z.object({
      period: z.string().regex(/^\d{4}-\d{2}$/).optional().describe("YYYY-MM. Defaults to the current month."),
    }),
    handler: async (ctx, args) => {
      const preview = await calculateEmployeePayrollPreview(ctx.employeeId!, args.period ?? currentPeriod(), 22, ctx.companyId);
      return {
        data: {
          period: preview.period,
          baseSalary: preview.baseSalary,
          workingDaysInMonth: preview.workingDaysInMonth,
          dailyRate: preview.dailyRate,
          unpaidLeaveDays: preview.unpaidLeaveDays,
          deduction: preview.deduction,
          netSalary: preview.netSalary,
          currency: preview.currency,
        },
        dataSource: "payroll preview",
      };
    },
  }),
  defineTool({
    name: "check_leave_feasibility",
    description: "Checks dates and leave type for the caller without creating anything: working days (weekends and holidays excluded), balance after, overlaps and validation errors.",
    kind: "read",
    allowedRoles: ALL_ROLES,
    needsEmployee: true,
    parameters: leaveDatesSchema,
    handler: async (ctx, args) => {
      const errors = draftDateErrors(args.startDate, args.endDate);
      if (errors.length > 0) return { data: { feasible: false, errors } };
      const assessment = await assessLeaveRequest(
        { ...args, employeeId: ctx.employeeId!, isPaid: args.leaveType !== "unpaid" },
        ctx.companyId
      );
      return {
        data: { feasible: assessment.errors.length === 0, ...assessment },
        dataSource: "leave ledger",
      };
    },
  }),
  defineTool({
    name: "create_leave_draft",
    description: "Prepares a leave request for the caller and shows a confirmation card. Nothing is submitted until the user clicks Confirm, so never say it was submitted.",
    kind: "write",
    allowedRoles: ALL_ROLES,
    needsEmployee: true,
    parameters: leaveDatesSchema.extend({
      reason: z.string().trim().min(3).max(300).optional().describe("The user's reason, if they gave one."),
    }),
    handler: async (ctx, args) => {
      const errors = draftDateErrors(args.startDate, args.endDate);
      if (errors.length > 0) return { data: { drafted: false, errors } };

      const payload: LeaveDraftPayload = {
        employeeId: ctx.employeeId!,
        leaveType: args.leaveType,
        startDate: args.startDate,
        endDate: args.endDate,
        halfDayOption: args.halfDayOption,
        reason: args.reason ?? "Requested through the HR Copilot",
      };
      const assessment = await assessLeaveRequest({ ...payload, isPaid: args.leaveType !== "unpaid" }, ctx.companyId);
      if (assessment.errors.length > 0) {
        return { data: { drafted: false, errors: assessment.errors }, dataSource: "leave ledger" };
      }

      const card = await createPendingAction(
        ctx,
        { toolName: "create_leave_draft", payload },
        {
          title: "Confirm leave request (Demande de congé)",
          summary: `${assessment.days} working day(s) of ${args.leaveType.replace("_", " / ")} leave, ${args.startDate} to ${args.endDate}.`,
          details: {
            "Leave type": args.leaveType,
            "Start date": args.startDate,
            "End date": args.endDate,
            "Working days": assessment.days,
            "Balance before": assessment.balanceBefore,
            "Balance after": assessment.balanceAfter,
          },
          warnings: [
            ...(assessment.isPaid ? [] : ["Unpaid leave: a deduction will apply in payroll."]),
            ...(assessment.holidaysInRange.length > 0
              ? [`Public holiday(s) in this range are not counted: ${assessment.holidaysInRange.join(", ")}.`]
              : []),
          ],
        }
      );
      return {
        data: { drafted: true, awaitingUserConfirmation: true, days: assessment.days, balanceAfter: assessment.balanceAfter },
        dataSource: "leave ledger",
        card,
      };
    },
  }),
  defineTool({
    name: "cancel_my_leave_request",
    description: "Prepares cancellation of one of the caller's own requests that has not started, and shows a confirmation card. Get the id from get_my_leave_requests. Nothing changes until the user clicks Confirm.",
    kind: "write",
    allowedRoles: ALL_ROLES,
    needsEmployee: true,
    parameters: z.object({
      requestId: z.string().min(1),
      reason: z.string().trim().min(3).max(300).optional(),
    }),
    handler: async (ctx, args) => {
      const requests = await getLeaveRequests({ employeeId: ctx.employeeId }, ctx.companyId);
      const request = requests.find((r) => r.id === args.requestId);
      const blocker = cancellationBlocker(request);
      if (blocker || !request) return { data: { drafted: false, errors: [blocker] }, dataSource: "leave requests" };

      const card = await createPendingAction(
        ctx,
        {
          toolName: "cancel_my_leave_request",
          payload: {
            employeeId: ctx.employeeId!,
            requestId: request.id,
            reason: args.reason ?? "Cancelled through the HR Copilot",
          },
        },
        {
          title: "Confirm leave cancellation",
          summary: `Cancel your ${request.status} ${request.leaveType.replace("_", " / ")} leave, ${request.startDate} to ${request.endDate}.`,
          details: {
            "Leave type": request.leaveType,
            "Start date": request.startDate,
            "End date": request.endDate,
            "Working days": request.days,
            Status: request.status,
          },
          warnings: [],
        }
      );
      return {
        data: { drafted: true, awaitingUserConfirmation: true },
        dataSource: "leave requests",
        card,
      };
    },
  }),
];

const sharedTools: HrTool[] = [
  defineTool({
    name: "search_hr_policies",
    description: "Searches the company HR policies. Call this before answering any policy question. Translate the query to English keywords.",
    kind: "read",
    allowedRoles: ALL_ROLES,
    parameters: z.object({ query: z.string().trim().min(2).max(200) }),
    handler: async (_ctx, args) => {
      const hits = searchPolicies(args.query);
      return {
        data: {
          found: hits.length > 0,
          sections: hits.map((hit) => ({ source: hit.source, section: hit.section, text: hit.text.trim() })),
        },
        policies: hits.map((hit) => ({ title: hit.source, section: hit.section })),
      };
    },
  }),
];

const departmentFilter = z.string().trim().max(80).optional().describe("Department name. Omit for the whole company.");

function matchesDepartment(departmentName: string, department?: string): boolean {
  return !department || departmentName.toLowerCase().includes(department.toLowerCase());
}

const adminTools: HrTool[] = [
  defineTool({
    name: "get_absent_today",
    description: "Who is absent today in the admin's company: on approved leave, or with no check-in yet.",
    kind: "read",
    allowedRoles: ADMIN_ONLY,
    parameters: z.object({ department: departmentFilter }),
    handler: async (ctx, args) => {
      const date = today();
      const [employees, attendance, approved, holidays] = await Promise.all([
        getEmployees({ status: "active" }, ctx.companyId),
        getTodayAttendance(ctx.companyId),
        getLeaveRequests({ status: "approved" }, ctx.companyId),
        getPublicHolidays(ctx.companyId),
      ]);
      const onLeave = approved.filter((r) => overlaps(r, date, date));
      const onLeaveIds = new Set(onLeave.map((r) => r.employeeId));
      const checkedIn = new Set(attendance.records.map((r) => r.employeeId));
      const inScope = employees.filter((e) => matchesDepartment(e.departmentName, args.department));
      const inScopeIds = new Set(inScope.map((e) => e.id));
      const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();

      return {
        data: {
          date,
          isWorkingDay: weekday !== 0 && weekday !== 6 && !holidays.some((h) => h.date === date),
          activeEmployees: inScope.length,
          onApprovedLeave: onLeave
            .filter((r) => inScopeIds.has(r.employeeId))
            .map((r) => ({ name: r.employeeName, department: r.departmentName, leaveType: r.leaveType, until: r.endDate })),
          noCheckIn: inScope
            .filter((e) => !checkedIn.has(e.id) && !onLeaveIds.has(e.id))
            .map((e) => ({ name: e.fullName, department: e.departmentName })),
        },
        dataSource: "attendance and leave requests",
      };
    },
  }),
  defineTool({
    name: "get_pending_requests",
    description: "Pending leave requests in the admin's company, with optional department and date filters.",
    kind: "read",
    allowedRoles: ADMIN_ONLY,
    parameters: z.object({ department: departmentFilter, startDate: isoDate.optional(), endDate: isoDate.optional() }),
    handler: async (ctx, args) => {
      const pending = await getLeaveRequests({ status: "pending" }, ctx.companyId);
      const matching = pending.filter(
        (r) =>
          matchesDepartment(r.departmentName, args.department) &&
          overlaps(r, args.startDate ?? "0000-01-01", args.endDate ?? "9999-12-31")
      );
      return {
        data: {
          total: matching.length,
          requests: matching.slice(0, LIST_LIMIT).map((r) => ({
            ...requestSummary(r),
            employeeName: r.employeeName,
            department: r.departmentName,
          })),
        },
        dataSource: "leave requests",
      };
    },
  }),
  defineTool({
    name: "get_team_calendar",
    description: "Approved and pending leave overlapping a date range, optionally for one department.",
    kind: "read",
    allowedRoles: ADMIN_ONLY,
    parameters: z.object({ startDate: isoDate, endDate: isoDate, department: departmentFilter }),
    handler: async (ctx, args) => {
      const requests = await getLeaveRequests({}, ctx.companyId);
      const matching = requests.filter(
        (r) =>
          (r.status === "approved" || r.status === "pending") &&
          overlaps(r, args.startDate, args.endDate) &&
          matchesDepartment(r.departmentName, args.department)
      );
      return {
        data: {
          total: matching.length,
          entries: matching.slice(0, LIST_LIMIT).map((r) => ({
            employeeName: r.employeeName,
            department: r.departmentName,
            startDate: r.startDate,
            endDate: r.endDate,
            days: r.days,
            status: r.status,
          })),
        },
        dataSource: "leave requests",
      };
    },
  }),
  defineTool({
    name: "get_employee_leave_summary",
    description: "Solde de congé for one employee of the admin's company, found by name or id. Salary is not included.",
    kind: "read",
    allowedRoles: ADMIN_ONLY,
    parameters: z.object({
      employee: z.string().trim().min(2).max(100).describe("The employee's name or id."),
    }),
    handler: async (ctx, args) => {
      const employees = await getEmployees({ status: "all" }, ctx.companyId);
      const needle = args.employee.toLowerCase();
      const byId = await getEmployeeById(args.employee, ctx.companyId).catch(() => null);
      const matches = byId ? [byId] : employees.filter((e) => e.fullName.toLowerCase().includes(needle));
      if (matches.length === 0) {
        return { data: { found: false, message: `No employee matching "${args.employee}" in this company.` } };
      }
      if (matches.length > 1) {
        return { data: { found: false, ambiguous: true, candidates: matches.slice(0, 10).map((e) => e.fullName) } };
      }
      const { solde, data } = await balanceData(matches[0].id, ctx.companyId);
      return {
        data: { found: true, department: matches[0].departmentName, ...data },
        dataSource: "leave ledger",
        balanceCard: balanceCard(solde),
      };
    },
  }),
  defineTool({
    name: "generate_payroll_preview",
    description: "Company-wide payroll preview for a month. Use for any request to preview or run payroll, unless the user clearly means only their own pay. Saves nothing. Returns totals and the employees with unpaid leave deductions.",
    kind: "read",
    allowedRoles: ADMIN_ONLY,
    parameters: z.object({
      period: z.string().regex(/^\d{4}-\d{2}$/).optional().describe("YYYY-MM. Defaults to the current month."),
    }),
    handler: async (ctx, args) => {
      const period = args.period ?? currentPeriod();
      const employees = await getEmployees({ status: "active" }, ctx.companyId);
      const previews = await Promise.all(
        employees.map((e) => calculateEmployeePayrollPreview(e.id, period, 22, ctx.companyId))
      );
      const total = (pick: (p: (typeof previews)[number]) => number) =>
        Math.round(previews.reduce((sum, p) => sum + pick(p), 0) * 100) / 100;
      return {
        data: {
          period,
          saved: false,
          employeeCount: previews.length,
          currency: "TND",
          totalGross: total((p) => p.baseSalary),
          totalDeductions: total((p) => p.deduction),
          totalNet: total((p) => p.netSalary),
          // Individual salaries stay out of the prompt. The payroll tab shows them to the admin.
          withDeductions: previews
            .filter((p) => p.deduction > 0)
            .slice(0, LIST_LIMIT)
            .map((p) => ({ name: p.employee.fullName, unpaidLeaveDays: p.unpaidLeaveDays, deduction: p.deduction })),
        },
        dataSource: "payroll preview",
      };
    },
  }),
];

/** Every HR tool. Use `toolsForContext` to get the ones a caller may have. */
export const HR_TOOLS: HrTool[] = [...sharedTools, ...employeeTools, ...adminTools];

export type { ToolContext, ToolResult };
