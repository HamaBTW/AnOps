import "server-only";

/**
 * Shared types for the AnOps AI provider system.
 * Every provider adapter must implement the AiProvider interface.
 */

export type AiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AiCompletionOptions = {
  /** Conversation history / prompt messages */
  messages: AiMessage[];
  /** Max tokens to generate (default: 1024) */
  maxTokens?: number;
  /** Temperature 0–1 (default: 0.7) */
  temperature?: number;
  /**
   * Override the model for this call.
   * If omitted, the provider uses its default free model.
   */
  model?: string;
  /**
   * Preferred provider (e.g. "groq", "openrouter", "gemini").
   * If set, AiMaster routes to this provider first.
   */
  provider?: string;
};

export type AiCompletionResult = {
  /** The generated text */
  text: string;
  /** Which provider actually handled this call */
  provider: string;
  /** Which model was used */
  model: string;
  /** Approximate token usage if the API reported it */
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  /** Optional metadata attached by agent hooks or context */
  metadata?: Record<string, unknown>;
};

/**
 * Contract every provider adapter must satisfy.
 */
export interface AiProvider {
  /** Human-readable name for logging */
  readonly name: string;
  /** True when the provider has at least one valid API key configured */
  readonly isAvailable: boolean;
  /** List of free model IDs this provider exposes (first = default) */
  readonly freeModels: string[];
  /** Run a chat completion and return the result */
  complete(options: AiCompletionOptions): Promise<AiCompletionResult>;
}

/**
 * Errors thrown by individual providers; caught by the master router.
 */
export class AiProviderError extends Error {
  constructor(
    public readonly provider: string,
    message: string,
    public readonly retryable: boolean = false
  ) {
    super(`[${provider}] ${message}`);
    this.name = "AiProviderError";
  }
}
