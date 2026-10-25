export type SocialPlatform = "facebook" | "instagram" | "linkedin";
export type SocialPublishResult = { status: "published" | "failed"; providerPostId?: string; retryable: boolean; safeError?: string };
export interface SocialPublisher { readonly platform: SocialPlatform; readonly configured: boolean; publish(content: string, idempotencyKey: string): Promise<SocialPublishResult>; }
class UnavailablePublisher implements SocialPublisher { constructor(readonly platform: SocialPlatform) {} readonly configured = false; async publish(): Promise<SocialPublishResult> { return { status: "failed", retryable: false, safeError: `${this.platform} publishing is not configured.` }; } }
export function getSocialPublisher(platform: SocialPlatform): SocialPublisher { return new UnavailablePublisher(platform); }
