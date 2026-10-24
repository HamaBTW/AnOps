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
