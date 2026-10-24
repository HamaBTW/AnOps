"use server";

import { revalidatePath } from "next/cache";
import { leaveRequestSchema, leaveReviewSchema } from "@/features/hr/schemas/hr.schema";
import {
  createLeaveRequest,
  reviewLeaveRequest,
  getLeaveRequests,
  getLeaveBalance,
} from "@/server/services/hr.service";
import type { LeaveRequest, LeaveBalance } from "@/features/hr/types";
import type { ActionResult } from "./employee.action";

export async function submitLeaveRequestAction(rawData: unknown): Promise<ActionResult<LeaveRequest>> {
  try {
    const parsed = leaveRequestSchema.safeParse(rawData);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message || "Invalid leave request parameters.";
      return { error: firstIssue };
    }

    const leaveRequest = await createLeaveRequest(parsed.data);
    revalidatePath("/hr");
    return { success: true, data: leaveRequest };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to submit leave request.";
    return { error: message };
  }
}

export async function reviewLeaveRequestAction(
  rawData: unknown,
  reviewerName = "HR Administrator"
): Promise<ActionResult<LeaveRequest>> {
  try {
    const parsed = leaveReviewSchema.safeParse(rawData);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message || "Invalid review parameters.";
      return { error: firstIssue };
    }

    const reviewed = await reviewLeaveRequest(parsed.data, reviewerName);
    revalidatePath("/hr");
    return { success: true, data: reviewed };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to review leave request.";
    return { error: message };
  }
}

export async function getLeaveBalanceAction(employeeId: string): Promise<ActionResult<LeaveBalance>> {
  try {
    const balance = await getLeaveBalance(employeeId);
    return { success: true, data: balance };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch leave balance.";
    return { error: message };
  }
}

export async function fetchLeaveRequestsAction(filter: {
  employeeId?: string;
  status?: string;
}): Promise<ActionResult<LeaveRequest[]>> {
  try {
    const requests = await getLeaveRequests(filter);
    return { success: true, data: requests };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch leave requests.";
    return { error: message };
  }
}
