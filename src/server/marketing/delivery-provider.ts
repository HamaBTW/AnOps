export type DeliveryChannel = "email" | "sms";
export type ProviderResult = { status: "accepted" | "rejected"; providerMessageId?: string; retryable: boolean; errorCategory?: "not_configured" | "rate_limited" | "timeout" | "permanent"; safeError?: string };
export type DeliveryRequest = { channel: DeliveryChannel; destination: string; subject?: string; body: string; idempotencyKey: string };

export interface MarketingDeliveryProvider { readonly channel: DeliveryChannel; readonly configured: boolean; send(request: DeliveryRequest): Promise<ProviderResult>; }

class UnavailableProvider implements MarketingDeliveryProvider {
  constructor(readonly channel: DeliveryChannel) {}
  readonly configured = false;
  async send(): Promise<ProviderResult> { return { status: "rejected", retryable: false, errorCategory: "not_configured", safeError: `${this.channel.toUpperCase()} provider is not configured.` }; }
}

export function getDeliveryProvider(channel: DeliveryChannel): MarketingDeliveryProvider { return new UnavailableProvider(channel); }
