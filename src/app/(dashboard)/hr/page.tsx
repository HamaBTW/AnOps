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

  const [
    employees,
    departments,
    jobTitles,
    stats,
    leaveRequests,
    todayAttendance,
    attendanceHistory,
    payslips,
    payrollSummary,
  ] = await Promise.all([
    getEmployees(),
    getDepartments(),
    getJobTitles(),
    getHRDashboardStats(),
    getLeaveRequests(),
    getTodayAttendance(),
    getAttendanceHistory(),
    getPayslips({ period: currentPeriod }),
    getPayrollSummary(currentPeriod),
  ]);

  // Find matching employee for current user (or fallback to Mohamed Abidi)
  let currentEmployee = null;
  if (sessionEmail) {
    currentEmployee = employees.find((e) => e.email.toLowerCase() === sessionEmail) || null;
  }
  if (!currentEmployee) {
    currentEmployee =
      employees.find((e) => e.email === "mohamed.abidi@anops.internal") ||
      employees[0] ||
      null;
  }

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
    />
  );
}
