"use server";

import { requireAuthUser } from "@/server/auth/rbac";
import { HRAssistantAgent } from "@/features/hr/ai/hr-assistant.agent";
import type { AgentMessage, AgentResponse } from "@/server/ai/base-agent";
import { z } from "zod";

const chatSchema = z.object({
  userMessage: z.string().min(1).max(2000),
  employeeId: z.string().optional(),
  history: z
    .array(
      z.object({
        id: z.string(),
        role: z.enum(["user", "assistant", "system"]),
        content: z.string(),
        timestamp: z.string(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    )
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
 * Accepts conversation history so the agent has multi-turn context.
 * Uses HRAssistantAgent (extends BaseAgent) which routes through AiMaster.
 */
export async function chatWithHRAssistantAction(
  rawData: unknown
): Promise<ChatResult> {
  try {
    const authUser = await requireAuthUser();

    const parsed = chatSchema.safeParse(rawData);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    const { userMessage, employeeId, history } = parsed.data;

    const response = await hrAgent.chat(
      history as AgentMessage[],
      userMessage,
      {
        employeeId: employeeId,
        companyId: authUser.companyId,
      }
    );

    return { ok: true, response };
  } catch (err) {
    const message = err instanceof Error ? err.message : "HR Assistant failed to respond.";
    console.error("[chatWithHRAssistantAction]", err);
    return { ok: false, error: message };
  }
}
