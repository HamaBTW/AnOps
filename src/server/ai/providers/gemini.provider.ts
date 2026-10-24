import "server-only";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { KeyPool } from "@/server/ai/key-pool";
import type { AiProvider, AiCompletionOptions, AiCompletionResult } from "@/server/ai/types";
import { AiProviderError } from "@/server/ai/types";

/**
 * Free Gemini models (Gemma family + Gemini flash variants).
 * Full list: https://ai.google.dev/gemini-api/docs/models/gemini
 * First entry is the default.
 */
const FREE_MODELS = [
  "gemma-3-27b-it",
  "gemma-3-12b-it",
  "gemma-3-4b-it",
  "gemma-3-1b-it",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
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
        const result = await chat.sendMessage(lastUserMsg);
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
