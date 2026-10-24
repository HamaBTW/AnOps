export type Department = {
  id: string;
  name: string;
  description?: string;
  employeeCount?: number;
  createdAt?: string;
};

export type JobTitle = {
  id: string;
  title: string;
  departmentId?: string;
  isPredefined: boolean;
  employeeCount?: number;
  createdAt?: string;
};

export type EmployeeRole = "employee" | "manager" | "hr_admin";
export type EmployeeStatus = "active" | "inactive";

export type Employee = {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  jobTitle: string;
  departmentId: string;
  departmentName: string;
  hireDate: string;
  baseSalary: number;
  status: EmployeeStatus;
  role: EmployeeRole;
  leaveAllowance: number;
  createdAt?: string;
  updatedAt?: string;
};

export type HRDashboardStats = {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  departmentCount: number;
  jobTitleCount: number;
  averageSalary: number;
  monthlyPayrollGross: number;
};

export type EmployeeFilterParams = {
  search?: string;
  departmentId?: string;
  status?: "all" | "active" | "inactive";
};

// ========================
// Leave / Time-off Types
// ========================

export type LeaveType =
  | "annual"
  | "sick"
  | "unpaid"
  | "maternity_paternity"
  | "bereavement"
  | "other";

export type LeaveStatus = "pending" | "approved" | "rejected";

export type LeaveRequest = {
  id: string;
  employeeId: string;
  employeeName: string;
  departmentName: string;
  leaveType: LeaveType;
  isPaid: boolean;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  days: number;
  reason: string;
  status: LeaveStatus;
  adminComment?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt?: string;
};

export type LeaveBalance = {
  employeeId: string;
  employeeName: string;
  year: number;
  allowance: number;       // e.g. 25
  usedPaidDays: number;    // approved paid leave days this year
  remainingDays: number;   // allowance - usedPaidDays
  unpaidDaysTaken: number; // unpaid days taken (feeds payroll)
};

// ========================
// Attendance Types
// ========================

export type AttendanceStatus = "present" | "checked_out";

export type AttendanceRecord = {
  id: string;
  employeeId: string;
  employeeName: string;
  departmentName: string;
  date: string; // YYYY-MM-DD
  checkIn: string; // ISO string
  checkOut?: string; // ISO string
  hoursWorked: number;
  status: AttendanceStatus;
  createdAt: string;
};

export type TodayAttendanceSummary = {
  totalActive: number;
  presentCount: number;
  checkedOutCount: number;
  absentCount: number;
  records: AttendanceRecord[];
};

// ========================
// Payroll Types
// ========================

export type PayslipRecord = {
  id: string;
  employeeId: string;
  employeeName: string;
  jobTitle: string;
  departmentName: string;
  period: string; // YYYY-MM e.g. "2026-10"
  baseSalary: number;
  workingDaysInMonth: number; // default 22
  dailyRate: number;
  unpaidLeaveDays: number;
  deduction: number;
  netSalary: number;
  currency: string; // "TND"
  status: "generated" | "paid";
  generatedAt: string;
};

export type PayrollSummary = {
  period: string;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  totalEmployees: number;
  payslipsGenerated: number;
};

// ========================
// AI Assistant & Policy Types
// ========================

export type HRPolicyDocument = {
  id: string;
  title: string;
  category: "leave" | "attendance" | "payroll" | "general";
  summary: string;
  content: string;
};

export type AIChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  toolData?: {
    type: "leave_balance" | "attendance" | "payroll_calculation" | "policy_excerpt";
    data: Record<string, unknown>;
  };
};
