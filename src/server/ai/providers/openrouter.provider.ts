import "server-only";

import type { AiProvider, AiCompletionOptions, AiCompletionResult } from "@/server/ai/types";
import { AiProviderError } from "@/server/ai/types";

/**
 * Free models available on OpenRouter (identified by the ":free" suffix).
 * Full list: https://openrouter.ai/models?q=free
 * First entry is the default.
 */
const FREE_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "meta-llama/llama-3.1-8b-instruct:free",
  "google/gemma-3-27b-it:free",
  "google/gemma-3-12b-it:free",
  "mistralai/mistral-7b-instruct:free",
  "qwen/qwen2.5-72b-instruct:free",
  "deepseek/deepseek-r1:free",
];

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions";

export class OpenRouterProvider implements AiProvider {
  readonly name = "OpenRouter";
  readonly freeModels = FREE_MODELS;

  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY?.trim() || undefined;
  }

  get isAvailable(): boolean {
    return !!this.apiKey;
  }

  async complete(options: AiCompletionOptions): Promise<AiCompletionResult> {
    if (!this.apiKey) {
      throw new AiProviderError(this.name, "OPENROUTER_API_KEY is not set.", false);
    }

    const model = options.model ?? FREE_MODELS[0];

    const body = {
      model,
      messages: options.messages,
      max_tokens: options.maxTokens ?? 1024,
      temperature: options.temperature ?? 0.7,
    };

    let response: Response;
    try {
      response = await fetch(OPENROUTER_BASE_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXTAUTH_URL ?? "http://localhost:3000",
          "X-Title": "AnOps",
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new AiProviderError(
        this.name,
        `Network error: ${(err as Error).message}`,
        true
      );
    }

    if (response.status === 429) {
      throw new AiProviderError(this.name, "Rate limited (429).", true);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new AiProviderError(
        this.name,
        `HTTP ${response.status}: ${text.slice(0, 200)}`,
        response.status >= 500
      );
    }

    const json = await response.json() as {
      choices: Array<{ message: { content: string } }>;
      model?: string;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };

    const text = json.choices?.[0]?.message?.content ?? "";
    return {
      text,
      provider: this.name,
      model: json.model ?? model,
      usage: {
        promptTokens: json.usage?.prompt_tokens,
        completionTokens: json.usage?.completion_tokens,
        totalTokens: json.usage?.total_tokens,
      },
    };
  }
}
