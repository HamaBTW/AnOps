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

import { requireAuthUser } from "@/server/auth/rbac";

export async function submitLeaveRequestAction(rawData: unknown): Promise<ActionResult<LeaveRequest>> {
  try {
    const authUser = await requireAuthUser();
    const parsed = leaveRequestSchema.safeParse(rawData);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message || "Invalid leave request parameters.";
      return { error: firstIssue };
    }

    // Backend restriction: non-admins can only request leave for themselves
    if (!authUser.isAdmin && authUser.employee && parsed.data.employeeId !== authUser.employee.id) {
      return { error: "You can only submit leave requests for yourself." };
    }

    const leaveRequest = await createLeaveRequest(parsed.data, authUser.companyId);
    revalidatePath("/hr");
    return { success: true, data: leaveRequest };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to submit leave request.";
    return { error: message };
  }
}

export async function reviewLeaveRequestAction(
  rawData: unknown,
  reviewerName?: string
): Promise<ActionResult<LeaveRequest>> {
  try {
    const authUser = await requireAuthUser();
    if (authUser.role !== "hr_admin" && authUser.role !== "manager") {
      return { error: "Forbidden: Only HR administrators or managers can review leave requests." };
    }

    const parsed = leaveReviewSchema.safeParse(rawData);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message || "Invalid review parameters.";
      return { error: firstIssue };
    }

    const actualReviewer = reviewerName || authUser.employee?.fullName || authUser.email;
    const reviewed = await reviewLeaveRequest(parsed.data, actualReviewer, authUser.companyId);
    revalidatePath("/hr");
    return { success: true, data: reviewed };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to review leave request.";
    return { error: message };
  }
}

export async function getLeaveBalanceAction(employeeId: string): Promise<ActionResult<LeaveBalance>> {
  try {
    const authUser = await requireAuthUser();
    // Non-admin can only inspect their own leave balance
    if (!authUser.isAdmin && authUser.employee && employeeId !== authUser.employee.id) {
      return { error: "Forbidden: You may only view your own leave balance." };
    }

    const balance = await getLeaveBalance(employeeId, 2026, authUser.companyId);
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
    const authUser = await requireAuthUser();
    // Non-admin can only fetch their own leave requests
    const effectiveFilter = !authUser.isAdmin && authUser.employee
      ? { ...filter, employeeId: authUser.employee.id }
      : filter;

    const requests = await getLeaveRequests(effectiveFilter, authUser.companyId);
    return { success: true, data: requests };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch leave requests.";
    return { error: message };
  }
}
