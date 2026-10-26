import "server-only";
import type { MarketingChannel } from "@/features/marketing/types/constants";
import { getBrevoState } from "@/server/marketing/providers/brevo/config";
import { createBrevoEmailProvider, createBrevoSmsProvider } from "@/server/marketing/providers/brevo/adapters";
import type { MessageProviders } from "@/server/marketing/providers/types";

export { ProviderError } from "@/server/marketing/providers/types";
export type { MessageProvider, MessageProviders, OutboundMessage } from "@/server/marketing/providers/types";

/**
 * Registered delivery providers. A channel is returned only when its adapter has every setting it needs:
 * the Brevo API key, a valid sender, and (for email) explicit approval of marketing use. Anything missing
 * returns no adapter, so scheduling is refused and nothing is ever reported as sent.
 */
export function getConfiguredProviders(): MessageProviders {
  const state = getBrevoState();
  if (!state.configured) return {};
  const providers: MessageProviders = {};
  const sms = createBrevoSmsProvider(state.config);
  if (sms) providers.sms = sms;
  const email = createBrevoEmailProvider(state.config);
  if (email) providers.email = email;
  return providers;
}

export type ConfiguredChannel = MarketingChannel;
