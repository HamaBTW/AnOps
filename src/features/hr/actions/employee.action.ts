"use server";

import { revalidatePath } from "next/cache";
import { employeeSchema } from "@/features/hr/schemas/hr.schema";
import {
  createEmployee,
  updateEmployee,
  toggleEmployeeStatus,
  getEmployees,
} from "@/server/services/hr.service";
import type { Employee, EmployeeFilterParams } from "@/features/hr/types";

export type ActionResult<T = unknown> = {
  success?: boolean;
  data?: T;
  error?: string;
};

export async function createEmployeeAction(rawData: unknown): Promise<ActionResult<Employee>> {
  try {
    const parsed = employeeSchema.safeParse(rawData);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message || "Invalid employee data.";
      return { error: firstIssue };
    }

    const employee = await createEmployee(parsed.data);
    revalidatePath("/hr");
    return { success: true, data: employee };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create employee.";
    return { error: message };
  }
}

export async function updateEmployeeAction(id: string, rawData: unknown): Promise<ActionResult<Employee>> {
  try {
    const parsed = employeeSchema.safeParse(rawData);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message || "Invalid employee data.";
      return { error: firstIssue };
    }

    const employee = await updateEmployee(id, parsed.data);
    revalidatePath("/hr");
    return { success: true, data: employee };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update employee.";
    return { error: message };
  }
}

export async function toggleEmployeeStatusAction(id: string): Promise<ActionResult<{ id: string; newStatus: "active" | "inactive" }>> {
  try {
    const result = await toggleEmployeeStatus(id);
    revalidatePath("/hr");
    return { success: true, data: result };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update employee status.";
    return { error: message };
  }
}

export async function filterEmployeesAction(filters: EmployeeFilterParams): Promise<ActionResult<Employee[]>> {
  try {
    const employees = await getEmployees(filters);
    return { success: true, data: employees };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch employees.";
    return { error: message };
  }
}
