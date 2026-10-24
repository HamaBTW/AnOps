"use server";

import { requireAuthUser } from "@/server/auth/rbac";
import { HRAssistantAgent } from "@/features/hr/ai/hr-assistant.agent";
import type { AgentMessage, AgentResponse } from "@/server/ai/base-agent";
import { z } from "zod";

const chatSchema = z.object({
  userMessage: z.string().min(1).max(2000),
  employeeId: z.string().optional(),
  /** Model ID to force (e.g. "llama-3.3-70b-versatile"). Omit for auto. */
  model: z.string().optional(),
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
 * Accepts conversation history for multi-turn context, and an optional
 * model override from the UI provider/model selector.
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

    const { userMessage, employeeId, model, history } = parsed.data;

    const response = await hrAgent.chat(
      history as AgentMessage[],
      userMessage,
      { employeeId, companyId: authUser.companyId },
      model  // model override — undefined = let AiMaster auto-select
    );

    return { ok: true, response };
  } catch (err) {
    const message = err instanceof Error ? err.message : "HR Assistant failed to respond.";
    console.error("[chatWithHRAssistantAction]", err);
    return { ok: false, error: message };
  }
}

