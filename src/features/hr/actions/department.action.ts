"use server";

import { revalidatePath } from "next/cache";
import { departmentSchema } from "@/features/hr/schemas/hr.schema";
import { createDepartment, getDepartments } from "@/server/services/hr.service";
import type { Department } from "@/features/hr/types";
import type { ActionResult } from "./employee.action";

export async function createDepartmentAction(name: string, description?: string): Promise<ActionResult<Department>> {
  try {
    const parsed = departmentSchema.safeParse({ name, description });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid department name." };
    }

    const dept = await createDepartment(parsed.data.name, parsed.data.description);
    revalidatePath("/hr");
    return { success: true, data: dept };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create department.";
    return { error: message };
  }
}

export async function fetchDepartmentsAction(): Promise<ActionResult<Department[]>> {
  try {
    const departments = await getDepartments();
    return { success: true, data: departments };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load departments.";
    return { error: message };
  }
}
