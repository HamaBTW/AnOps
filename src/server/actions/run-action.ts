import "server-only";
import { randomUUID } from "crypto";
import type { ZodType } from "zod";
import { resolveWorkspace, type WorkspaceContext } from "@/server/tenancy/workspace";
import { consumeRateLimit } from "@/server/security/rate-limit";
import { AppError, isAppError, type ActionError, type ActionResult } from "@/shared/lib/errors";
import { toFieldErrors } from "@/shared/lib/validation";

type RateLimit = { limit: number; windowMs: number };

/**
 * Runs an authenticated, tenant-resolved operation for a server action. Every
 * failure becomes a typed result with a request ID. Unexpected errors are logged
 * by name only, and their messages are never returned to the client.
 */
export async function runAction<T>(
  name: string,
  operation: (ctx: WorkspaceContext) => Promise<T>,
  options: { rateLimit?: RateLimit } = {}
): Promise<ActionResult<T>> {
  const requestId = randomUUID();
  try {
    const ctx = await resolveWorkspace(requestId);
    if (options.rateLimit) {
      consumeRateLimit(
        `${ctx.userId.toHexString()}:${name}`,
        options.rateLimit.limit,
        options.rateLimit.windowMs
      );
    }
    const data = await operation(ctx);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: toActionError(error, requestId, name) };
  }
}

/** Validates untrusted input with the shared schema. Throws VALIDATION_ERROR with field details. */
export function parseInput<T>(schema: ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  const details = toFieldErrors(result.error);
  const message = result.error.issues[0]?.message ?? "The submitted data is invalid.";
  throw new AppError("VALIDATION_ERROR", message, details);
}

export function toActionError(error: unknown, requestId: string, label: string): ActionError {
  if (isAppError(error)) {
    return {
      code: error.code,
      message: error.message,
      requestId,
      details: error.details,
    };
  }
  console.error(`[action] ${label} failed (request ${requestId}): ${error instanceof Error ? error.name : "unknown error"}`);
  return {
    code: "INTERNAL",
    message: "Something went wrong. Please try again.",
    requestId,
  };
}
