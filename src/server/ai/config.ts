import "server-only";

/**
 * Reads the Groq key list. `GROQ_API_KEYS` (comma-separated, rotated on 429) is preferred;
 * `GROQ_API_KEY` (single key, as documented in .env) is accepted so a one-key setup works.
 * Returns undefined when neither is set. Keys are never logged or returned to the browser.
 */
export function groqApiKeyList(): string | undefined {
  return process.env.GROQ_API_KEYS?.trim() || process.env.GROQ_API_KEY?.trim() || undefined;
}

/**
 * Optional Groq model override (`GROQ_MODEL`). Undefined uses the provider's default free model.
 * An id Groq does not serve returns 404, and the Groq adapter then retries once with its default model.
 */
export function groqModelOverride(): string | undefined {
  return process.env.GROQ_MODEL?.trim() || undefined;
}
