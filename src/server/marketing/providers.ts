import "server-only";
import type { MarketingChannel } from "@/features/marketing/types/constants";

/**
 * Outbound message provider contract. An adapter implements this interface and is registered in
 * `getConfiguredProviders`. No adapter is registered in this codebase, so no campaign can reach a real
 * recipient until one is added and configured. A campaign cannot be scheduled while its channel has no
 * adapter, which keeps "sent" from ever meaning "accepted by a test stub".
 */
export class ProviderError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(code: string, message: string, retryable: boolean) {
    super(message);
    this.name = "ProviderError";
    this.code = code;
    this.retryable = retryable;
  }
}

export type OutboundMessage = {
  /** Stable per delivery. Providers that support idempotency keys must use it to deduplicate retries. */
  idempotencyKey: string;
  to: string;
  subject: string;
  text: string;
  html: string | null;
};

export interface MessageProvider {
  readonly name: string;
  readonly channel: MarketingChannel;
  /** Minimum delay between two sends through this provider. This is the provider rate limit. */
  readonly minIntervalMs: number;
  /** Must honour the abort signal. Resolves only when the provider has accepted the message. */
  send(message: OutboundMessage, options: { signal: AbortSignal }): Promise<{ providerMessageId: string }>;
}

export type MessageProviders = Partial<Record<MarketingChannel, MessageProvider>>;

/** Registered adapters. Empty until an email or SMS provider is implemented and configured. */
export function getConfiguredProviders(): MessageProviders {
  return {};
}
