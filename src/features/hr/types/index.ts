import type { Employee, EmployeeRole, EmployeeStatus } from "@/features/hr/schemas/employee.schema";

export type { Employee, EmployeeRole, EmployeeStatus };

export interface HrService {
  listEmployees(query?: { status?: EmployeeStatus }): Promise<Employee[]>;
  getEmployee(id: string): Promise<Employee | null>;
  createEmployee(data: CreateEmployeeInput): Promise<Employee>;
  updateEmployee(id: string, data: Partial<CreateEmployeeInput>): Promise<Employee>;
  deactivateEmployee(id: string): Promise<void>;
}

export interface CreateEmployeeInput {
  name: string;
  email: string;
  jobTitle: string;
  baseSalary: number;
  role: EmployeeRole;
  status: EmployeeStatus;
}
