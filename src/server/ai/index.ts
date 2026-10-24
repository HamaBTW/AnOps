import "server-only";

import { GroqProvider } from "@/server/ai/providers/groq.provider";
import { OpenRouterProvider } from "@/server/ai/providers/openrouter.provider";
import { GeminiProvider } from "@/server/ai/providers/gemini.provider";
import type { AiProvider, AiCompletionOptions, AiCompletionResult } from "@/server/ai/types";
import { AiProviderError } from "@/server/ai/types";

/**
 * AI Provider Master Router
 * ─────────────────────────
 * Central hub for all AI completions in AnOps.
 *
 * Priority order (highest → lowest):
 *   1. Groq        — fast, generous free tier, multi-key rotation
 *   2. OpenRouter  — broad model selection, free tier
 *   3. Gemini      — Google Gemma family, reliable free tier
 *
 * The router tries each available provider in order. If a provider
 * fails with a retryable error (429, network) it falls back to the
 * next one automatically. Non-retryable errors (auth, bad request)
 * cause the router to skip that provider and log a warning.
 *
 * Usage:
 *   import { ai } from "@/server/ai";
 *   const result = await ai.complete({ messages: [...] });
 */

class AiMaster {
  private providers: AiProvider[];

  constructor() {
    // Instantiated once per server lifetime (module singleton)
    this.providers = [
      new GroqProvider(),
      new OpenRouterProvider(),
      new GeminiProvider(),
    ];
  }

  /**
   * Returns providers that are configured (have at least one key).
   */
  get availableProviders(): AiProvider[] {
    return this.providers.filter((p) => p.isAvailable);
  }

  /**
   * Run a chat completion using the best available provider.
   * Falls back through the provider priority list on failure.
   *
   * @throws Error when ALL configured providers fail.
   */
  async complete(options: AiCompletionOptions): Promise<AiCompletionResult> {
    const candidates = this.availableProviders;

    if (candidates.length === 0) {
      throw new Error(
        "[AiMaster] No AI providers are configured. " +
        "Set GROQ_API_KEYS, OPENROUTER_API_KEY, or GEMINI_API_KEYS in your .env."
      );
    }

    const errors: string[] = [];

    for (const provider of candidates) {
      try {
        console.info(`[AiMaster] Trying provider: ${provider.name}`);
        const result = await provider.complete(options);
        console.info(
          `[AiMaster] Success via ${provider.name} / ${result.model}` +
          (result.usage?.totalTokens ? ` (${result.usage.totalTokens} tokens)` : "")
        );
        return result;
      } catch (err) {
        const msg = err instanceof AiProviderError
          ? err.message
          : `${provider.name}: ${(err as Error).message}`;

        console.warn(`[AiMaster] Provider failed — ${msg}`);
        errors.push(msg);

        // Non-retryable (auth / bad request) — still fall through to next provider
        // since the next provider may handle it fine.
      }
    }

    throw new Error(
      `[AiMaster] All providers failed:\n  • ${errors.join("\n  • ")}`
    );
  }

  /**
   * Convenience: quick single-turn prompt.
   *
   * @example
   *   const text = await ai.ask("Summarise this attendance report: ...");
   */
  async ask(
    userPrompt: string,
    systemPrompt?: string,
    options?: Omit<AiCompletionOptions, "messages">
  ): Promise<string> {
    const messages: AiCompletionOptions["messages"] = [];
    if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
    messages.push({ role: "user", content: userPrompt });

    const result = await this.complete({ ...options, messages });
    return result.text;
  }

  /**
   * Returns a summary of which providers are ready to use.
   * Useful for health checks / admin dashboards.
   */
  status(): Array<{ name: string; available: boolean; models: string[] }> {
    return this.providers.map((p) => ({
      name: p.name,
      available: p.isAvailable,
      models: p.freeModels,
    }));
  }
}

// Module-level singleton — one instance for the entire server lifetime.
export const ai = new AiMaster();

// Re-export types for convenience
export type { AiCompletionOptions, AiCompletionResult, AiMessage } from "@/server/ai/types";
