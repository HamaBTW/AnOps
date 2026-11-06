import "server-only";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { KeyPool } from "@/server/ai/key-pool";
import type { AiProvider, AiCompletionOptions, AiCompletionResult } from "@/server/ai/types";
import { AiProviderError } from "@/server/ai/types";

const REQUEST_TIMEOUT_MS = 20_000;

/**
 * Free Gemini models (Gemini flash variants + Gemma family).
 * Full list: https://ai.google.dev/gemini-api/docs/models/gemini
 * First entry is the default.
 */
const FREE_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-flash-latest",
  "gemini-2.5-flash-lite",
  "gemma-4-26b-a4b-it",
  "gemma-4-31b-it",
];

const MAX_RETRIES_PER_CALL = 3;

export class GeminiProvider implements AiProvider {
  readonly name = "Gemini";
  readonly freeModels = FREE_MODELS;

  private pool: KeyPool;

  constructor() {
    this.pool = new KeyPool(process.env.GEMINI_API_KEYS);
  }

  get isAvailable(): boolean {
    return this.pool.hasKeys;
  }

  async complete(options: AiCompletionOptions): Promise<AiCompletionResult> {
    // If a model is specifically meant for another provider, skip Gemini
    if (
      options.model &&
      (options.model.includes(":free") ||
        options.model.startsWith("openai/") ||
        options.model.startsWith("qwen/") ||
        options.model.startsWith("allam-") ||
        options.model.startsWith("nvidia/"))
    ) {
      throw new AiProviderError(this.name, `Model ${options.model} is not supported by Gemini`, false);
    }

    const model = options.model ?? FREE_MODELS[0];
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES_PER_CALL; attempt++) {
      let apiKey: string;
      try {
        apiKey = this.pool.next();
      } catch (err) {
        throw new AiProviderError(this.name, (err as Error).message, true);
      }

      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const gemModel = genAI.getGenerativeModel({
          model,
          generationConfig: {
            maxOutputTokens: options.maxTokens ?? 1024,
            temperature: options.temperature ?? 0.7,
          },
        });

        // Separate system prompt from the conversation
        const systemMsg = options.messages.find((m) => m.role === "system");
        const conversationMsgs = options.messages.filter((m) => m.role !== "system");

        // Build Gemini history (all turns except the last user message)
        const history = conversationMsgs.slice(0, -1).map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));

        // System instruction (injected as a preamble if the model supports it)
        const chat = gemModel.startChat({
          history,
          ...(systemMsg
            ? {
                systemInstruction: {
                  role: "user",
                  parts: [{ text: systemMsg.content }],
                },
              }
            : {}),
        });

        const lastUserMsg = conversationMsgs[conversationMsgs.length - 1]?.content ?? "";
        const result = await chat.sendMessage(lastUserMsg, { timeout: REQUEST_TIMEOUT_MS, ...(options.signal ? { signal: options.signal } : {}) });
        const text = result.response.text();

        return {
          text,
          provider: this.name,
          model,
          // Gemini SDK returns usage in usageMetadata
          usage: {
            promptTokens: result.response.usageMetadata?.promptTokenCount,
            completionTokens: result.response.usageMetadata?.candidatesTokenCount,
            totalTokens: result.response.usageMetadata?.totalTokenCount,
          },
        };
      } catch (err: unknown) {
        const message = (err as Error).message ?? "";
        // 429 / RESOURCE_EXHAUSTED
        const isRateLimit =
          (err as { status?: number })?.status === 429 ||
          message.includes("429") ||
          message.toUpperCase().includes("RESOURCE_EXHAUSTED");

        if (isRateLimit) {
          this.pool.markRateLimited(apiKey!);
          lastError = err as Error;
          console.warn(`[Gemini] Rate-limited on key ...${apiKey!.slice(-6)}, rotating (attempt ${attempt + 1}/${MAX_RETRIES_PER_CALL})`);
          continue;
        }

        // If a model override returned 404 (not found), recover with the default free model
        if ((message.includes("404") || message.includes("not found")) && model !== FREE_MODELS[0]) {
          console.warn(`[Gemini] Model "${model}" not found (404), recovering with ${FREE_MODELS[0]}`);
          return await this.complete({ ...options, model: FREE_MODELS[0] });
        }

        throw new AiProviderError(
          this.name,
          `API error: ${message}`,
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
