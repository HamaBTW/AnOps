import type { z } from "zod";

/** Returns the first friendly Zod validation message for client-side forms. */
export function validateMarketingInput<T>(schema: z.ZodType<T>, input: unknown): { data: T } | { error: string } {
  const result = schema.safeParse(input);
  return result.success ? { data: result.data } : { error: result.error.issues[0]?.message ?? "Please review the highlighted information." };
}
