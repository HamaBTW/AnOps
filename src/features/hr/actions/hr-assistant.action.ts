"use server";

import { requireAuthUser } from "@/server/auth/rbac";
import { resolveAiAccess } from "@/server/ai/access/access.service";
import { gatedComplete } from "@/server/ai/gate";
import { resolveWorkspace } from "@/server/tenancy/workspace";
import { isAppError } from "@/shared/lib/errors";
import { HRAssistantAgent } from "@/features/hr/ai/hr-assistant.agent";
import type { AgentMessage, AgentResponse } from "@/server/ai/base-agent";
import { z } from "zod";

const chatSchema = z.object({
  userMessage: z.string().min(1).max(2000),
  employeeId: z.string().optional(),
  // The provider and the model are chosen on the server. Anything a client sends for them is ignored.
  history: z
    .array(
      z.object({
        id: z.string(),
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().max(4000),
        timestamp: z.string(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .max(20)
    .optional()
    .default([]),
});

type ChatResult =
  | { ok: true; response: AgentResponse }
  | { ok: false; error: string };

// Module-level singleton — one agent instance per server lifetime
const hrAgent = new HRAssistantAgent();

/**
 * Server action: chat with the HR Assistant agent.
 *
 * It runs inside the AI Command Center's controls: the platform and company switches, the member's own AI grant for HR, the
 * rate limits and the daily token budget (all through the shared gate). Salary and payroll figures reach the model only for a
 * member who also holds the sensitive-HR switch. Failures return a fixed message, never a provider's text.
 */
export async function chatWithHRAssistantAction(
  rawData: unknown
): Promise<ChatResult> {
  try {
    const authUser = await requireAuthUser();
    const ctx = await resolveWorkspace();

    const parsed = chatSchema.safeParse(rawData);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    // The gate (below) decides, from live data, whether this person may use AI for HR at all. Here only the sensitive switch is read.
    const access = await resolveAiAccess(ctx);
    const { userMessage, employeeId, history } = parsed.data;

    // Security: Non-admins cannot query other employee IDs via client payload
    let effectiveEmployeeId = employeeId;
    if (!authUser.isAdmin) {
      effectiveEmployeeId = authUser.employee?.id || employeeId;
    }

    const response = await hrAgent.chat(
      history as AgentMessage[],
      userMessage,
      {
        employeeId: effectiveEmployeeId,
        companyId: authUser.companyId,
        isAdmin: authUser.isAdmin,
        userRole: authUser.role,
        userEmployeeId: authUser.employee?.id,
        userFullName: authUser.employee?.fullName,
        userEmail: authUser.email,
        // Salary, daily rate and payroll deductions are only put in the prompt for a member with the sensitive-HR switch.
        includePayroll: access.grant.canViewSensitiveHr,
      },
      (options) => gatedComplete(ctx, { module: "hr", operation: "view", feature: "hr.assistant", sensitiveHr: false }, options)
    );

    return { ok: true, response };
  } catch (err) {
    // Expected refusals (no access, switched off, rate limited) are shown as they are; anything else is a fixed message.
    if (isAppError(err)) return { ok: false, error: err.message };
    console.error("[chatWithHRAssistantAction]", err instanceof Error ? err.name : "unknown");
    return { ok: false, error: "The HR assistant is unavailable right now. Please try again." };
  }
}
