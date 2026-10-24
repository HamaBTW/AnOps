import "server-only";

import Groq from "groq-sdk";
import { KeyPool } from "@/server/ai/key-pool";
import type { AiProvider, AiCompletionOptions, AiCompletionResult } from "@/server/ai/types";
import { AiProviderError } from "@/server/ai/types";

/**
 * Free Groq models (as of 2025).
 * First entry is the default. Full list: https://console.groq.com/docs/models
 */
const FREE_MODELS = [
  "llama-3.3-70b-versatile",
  "llama3-8b-8192",
  "llama3-70b-8192",
  "mixtral-8x7b-32768",
  "gemma2-9b-it",
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
