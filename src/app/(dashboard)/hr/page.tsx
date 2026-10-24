import type { Metadata } from "next";
import { auth } from "@/server/auth";
import {
  getEmployees,
  getDepartments,
  getJobTitles,
  getHRDashboardStats,
  getLeaveRequests,
  getLeaveBalance,
  getTodayAttendance,
  getAttendanceHistory,
  getPayslips,
  getPayrollSummary,
} from "@/server/services/hr.service";
import { HRDashboardClient } from "@/features/hr/components/hr-dashboard-client";

export const metadata: Metadata = {
  title: "HR & Payroll | AnOps ERP",
  description:
    "Comprehensive HR management: Employees, Time-off Approvals, Attendance Punch, Payroll Generator & AI Policy Assistant.",
};

export default async function HRPage() {
  const currentPeriod = "2026-10";

  const session = await auth();
  const sessionEmail = session?.user?.email?.toLowerCase().trim();
  let userRole = session?.user?.role ?? "employee";
  const envAdminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  if (userRole === "employee" && envAdminEmail && sessionEmail === envAdminEmail) {
    userRole = "hr_admin";
  }

  // Always load departments and job titles for the form modals (needed for any role)
  const [employees, departments, jobTitles, stats] = await Promise.all([
    getEmployees(),
    getDepartments(),
    getJobTitles(),
    getHRDashboardStats(),
  ]);

  // Find the current employee record for the logged-in user
  let currentEmployee = null;
  if (sessionEmail) {
    currentEmployee = employees.find((e) => e.email.toLowerCase() === sessionEmail) || null;
  }
  if (!currentEmployee) {
    currentEmployee = employees[0] || null;
  }

  // Backend restriction: non-admin employees only get their own data
  const employeeIdFilter = userRole === "hr_admin" ? undefined : currentEmployee?.id;

  const [leaveRequests, todayAttendance, attendanceHistory, payslips, payrollSummary] = await Promise.all([
    getLeaveRequests(employeeIdFilter ? { employeeId: employeeIdFilter } : {}),
    getTodayAttendance(),
    getAttendanceHistory(employeeIdFilter ? { employeeId: employeeIdFilter } : {}),
    getPayslips({ period: currentPeriod, ...(employeeIdFilter ? { employeeId: employeeIdFilter } : {}) }),
    userRole === "hr_admin"
      ? getPayrollSummary(currentPeriod)
      : Promise.resolve({
          period: currentPeriod,
          totalGross: 0,
          totalDeductions: 0,
          totalNet: 0,
          totalEmployees: 1,
          payslipsGenerated: 0,
        }),
  ]);

  const leaveBalance = currentEmployee
    ? await getLeaveBalance(currentEmployee.id)
    : {
        employeeId: "",
        employeeName: "",
        year: 2026,
        allowance: 25,
        usedPaidDays: 0,
        remainingDays: 25,
        unpaidDaysTaken: 0,
      };

  return (
    <HRDashboardClient
      initialEmployees={employees}
      initialDepartments={departments}
      initialJobTitles={jobTitles}
      initialStats={stats}
      initialLeaveRequests={leaveRequests}
      initialLeaveBalance={leaveBalance}
      initialTodayAttendance={todayAttendance}
      initialAttendanceHistory={attendanceHistory}
      initialPayslips={payslips}
      initialPayrollSummary={payrollSummary}
      currentEmployee={currentEmployee}
      userRole={userRole}
    />
  );
}
