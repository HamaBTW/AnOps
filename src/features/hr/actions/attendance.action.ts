"use server";

import { revalidatePath } from "next/cache";
import {
  checkInEmployee,
  checkOutEmployee,
  getTodayAttendance,
  getAttendanceHistory,
} from "@/server/services/hr.service";
import type { AttendanceRecord, TodayAttendanceSummary } from "@/features/hr/types";
import type { ActionResult } from "./employee.action";

export async function checkInAction(employeeId: string): Promise<ActionResult<AttendanceRecord>> {
  try {
    if (!employeeId) {
      return { error: "Employee ID is required." };
    }
    const record = await checkInEmployee(employeeId);
    revalidatePath("/hr");
    return { success: true, data: record };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to record check-in.";
    return { error: message };
  }
}

export async function checkOutAction(employeeId: string): Promise<ActionResult<AttendanceRecord>> {
  try {
    if (!employeeId) {
      return { error: "Employee ID is required." };
    }
    const record = await checkOutEmployee(employeeId);
    revalidatePath("/hr");
    return { success: true, data: record };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to record check-out.";
    return { error: message };
  }
}

export async function getTodayAttendanceAction(): Promise<ActionResult<TodayAttendanceSummary>> {
  try {
    const summary = await getTodayAttendance();
    return { success: true, data: summary };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load today's attendance.";
    return { error: message };
  }
}

export async function getAttendanceHistoryAction(filter: {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<ActionResult<AttendanceRecord[]>> {
  try {
    const history = await getAttendanceHistory(filter);
    return { success: true, data: history };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch attendance history.";
    return { error: message };
  }
}
