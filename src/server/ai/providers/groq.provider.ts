import "server-only";

import Groq from "groq-sdk";
import { KeyPool } from "@/server/ai/key-pool";
import type { AiProvider, AiCompletionOptions, AiCompletionResult } from "@/server/ai/types";
import { AiProviderError } from "@/server/ai/types";

/**
 * Free Groq models.
 * First entry is the default. Full list: https://console.groq.com/docs/models
 */
const FREE_MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.8-27b",
  "allam-2-7b",
];

const MAX_RETRIES_PER_CALL = 3;

export class GroqProvider implements AiProvider {
  readonly name = "Groq";
  readonly freeModels = FREE_MODELS;

  private pool: KeyPool;

  constructor() {
    this.pool = new KeyPool(process.env.GROQ_API_KEYS);
  }

  get isAvailable(): boolean {
    return this.pool.hasKeys;
  }

  async complete(options: AiCompletionOptions): Promise<AiCompletionResult> {
    // If a non-Groq model was explicitly requested, bail early so the router reaches the right provider
    if (
      options.model &&
      (options.model.includes(":free") ||
        options.model.startsWith("gemini") ||
        options.model.startsWith("models/") ||
        options.model.startsWith("nvidia/"))
    ) {
      throw new AiProviderError(this.name, `Model ${options.model} is not supported by Groq`, false);
    }

    const model = options.model ?? FREE_MODELS[0];
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES_PER_CALL; attempt++) {
      let apiKey: string;
      try {
        apiKey = this.pool.next();
      } catch (err) {
        // All keys exhausted
        throw new AiProviderError(this.name, (err as Error).message, true);
      }

      const client = new Groq({ apiKey });

      try {
        const response = await client.chat.completions.create({
          model,
          messages: options.messages,
          max_tokens: options.maxTokens ?? 1024,
          temperature: options.temperature ?? 0.7,
        });

        const choice = response.choices[0];
        return {
          text: choice.message?.content ?? "",
          provider: this.name,
          model,
          usage: {
            promptTokens: response.usage?.prompt_tokens,
            completionTokens: response.usage?.completion_tokens,
            totalTokens: response.usage?.total_tokens,
          },
        };
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status;

        if (status === 429) {
          // Rate-limited — mark key and retry with next
          this.pool.markRateLimited(apiKey);
          lastError = err as Error;
          console.warn(`[Groq] 429 on key ...${apiKey.slice(-6)}, rotating (attempt ${attempt + 1}/${MAX_RETRIES_PER_CALL})`);
          continue;
        }

        // If the model was not found (404 / deprecated) and was an override, try the default free model
        if (status === 404 && model !== FREE_MODELS[0]) {
          console.warn(`[Groq] Model "${model}" not found (404), recovering with ${FREE_MODELS[0]}`);
          try {
            const fallbackRes = await client.chat.completions.create({
              model: FREE_MODELS[0],
              messages: options.messages,
              max_tokens: options.maxTokens ?? 1024,
              temperature: options.temperature ?? 0.7,
            });
            const choice = fallbackRes.choices[0];
            return {
              text: choice.message?.content ?? "",
              provider: this.name,
              model: FREE_MODELS[0],
              usage: {
                promptTokens: fallbackRes.usage?.prompt_tokens,
                completionTokens: fallbackRes.usage?.completion_tokens,
                totalTokens: fallbackRes.usage?.total_tokens,
              },
            };
          } catch {
            // fall through to error
          }
        }

        // Non-retryable error
        throw new AiProviderError(
          this.name,
          `API error: ${(err as Error).message}`,
          false
        );
      }
    }

    throw new AiProviderError(
      this.name,
      `All retries exhausted: ${lastError?.message}`,
      true
    );
  }
}
