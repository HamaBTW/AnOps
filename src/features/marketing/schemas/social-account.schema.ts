import { z } from "zod";
export const socialAccountPlatformSchema = z.enum(["facebook", "instagram", "linkedin"]);
export const socialAccountMetadataSchema = z.object({ platform: socialAccountPlatformSchema, providerAccountId: z.string().trim().min(1).max(240), displayName: z.string().trim().min(1).max(160), scopes: z.array(z.string().trim().max(120)).max(50).default([]), tokenExpiresAt: z.string().datetime({ offset: true }).optional() });
