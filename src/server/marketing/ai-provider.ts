import type { AICopyInput } from "@/features/marketing/schemas/ai.schema";
import type { z } from "zod";
import { aiCopyOutputSchema } from "@/features/marketing/schemas/ai.schema";
export type AICopyOutput = z.infer<typeof aiCopyOutputSchema>;
export interface MarketingAIProvider { readonly configured: boolean; readonly provider: string; readonly model?: string; generate(input: AICopyInput): Promise<AICopyOutput[]>; }
class UnavailableAIProvider implements MarketingAIProvider { readonly configured = false; readonly provider = "unconfigured"; async generate(): Promise<AICopyOutput[]> { throw new Error("AI_NOT_CONFIGURED"); } }
export function getMarketingAIProvider(): MarketingAIProvider { return new UnavailableAIProvider(); }
