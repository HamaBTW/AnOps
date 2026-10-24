"use server";

import { revalidatePath } from "next/cache";
import { jobTitleSchema } from "@/features/hr/schemas/hr.schema";
import {
  getJobTitles,
  ensureJobTitle,
  deleteJobTitle,
  seedHrDefaults,
} from "@/server/services/hr.service";
import type { JobTitle } from "@/features/hr/types";
import type { ActionResult } from "./employee.action";

export async function createJobTitleAction(title: string, departmentId?: string): Promise<ActionResult<JobTitle>> {
  try {
    const parsed = jobTitleSchema.safeParse({ title, departmentId });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid job title." };
    }

    const jobTitle = await ensureJobTitle(parsed.data.title, parsed.data.departmentId, false);
    revalidatePath("/hr");
    return { success: true, data: jobTitle };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create job title.";
    return { error: message };
  }
}

export async function deleteJobTitleAction(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    await deleteJobTitle(id);
    revalidatePath("/hr");
    return { success: true, data: { id } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete job title.";
    return { error: message };
  }
}

export async function fetchJobTitlesAction(): Promise<ActionResult<JobTitle[]>> {
  try {
    const titles = await getJobTitles();
    return { success: true, data: titles };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load job titles.";
    return { error: message };
  }
}

export async function reseedDefaultsAction(): Promise<ActionResult<boolean>> {
  try {
    await seedHrDefaults();
    revalidatePath("/hr");
    return { success: true, data: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to seed HR defaults.";
    return { error: message };
  }
}
