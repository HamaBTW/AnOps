import { z } from "zod";
import { lifecycleStages, marketingChannels } from "@/features/marketing/types";

export const contactInputSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(80),
  lastName: z.string().trim().min(1, "Last name is required.").max(80),
  email: z.string().trim().email("Enter a valid email.").max(254).optional().or(z.literal("")),
  phone: z.string().trim().max(32).optional().or(z.literal("")),
  source: z.string().trim().min(1).max(80),
  lifecycleStage: z.enum(lifecycleStages),
  tagIds: z.array(z.string().regex(/^[a-f0-9]{24}$/i)).max(30).default([]),
});

export const contactQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(80).default(""),
  lifecycleStage: z.enum(lifecycleStages).optional(),
  source: z.string().trim().max(80).optional(),
  active: z.enum(["true", "false", "all"]).default("true"),
  sort: z.enum(["createdAt", "name", "updatedAt"]).default("createdAt"),
  direction: z.enum(["asc", "desc"]).default("desc"),
});

export const consentInputSchema = z.object({
  channel: z.enum(marketingChannels),
  purpose: z.string().trim().min(1).max(120),
  status: z.enum(["granted", "revoked"]),
  source: z.string().trim().min(1).max(120),
});

export type ContactInput = z.infer<typeof contactInputSchema>;

export const audienceInputSchema = z.object({ name: z.string().trim().min(1).max(120), description: z.string().trim().max(500).default("") });
export const membershipSchema = z.object({ contactId: z.string().regex(/^[a-f0-9]{24}$/i) });
export const consentRecordSchema = z.object({ channel: z.enum(marketingChannels), purpose: z.string().trim().min(1).max(120), status: z.enum(["granted", "revoked"]), source: z.string().trim().min(1).max(120) });
export const campaignInputSchema = z.object({ name: z.string().trim().min(1).max(160), channel: z.enum(marketingChannels), subject: z.string().trim().max(240).optional().or(z.literal("")), body: z.string().trim().min(1).max(10000), audienceId: z.string().regex(/^[a-f0-9]{24}$/i), scheduledAt: z.string().datetime({ offset: true }).optional() });
export const templateInputSchema = z.object({ name: z.string().trim().min(1).max(160), description: z.string().trim().max(500).default(""), channel: z.enum(marketingChannels), subject: z.string().trim().max(240).optional().or(z.literal("")), body: z.string().trim().min(1).max(10000) }).superRefine((value, ctx) => { if (value.channel === "email" && !value.subject) ctx.addIssue({ code: "custom", path: ["subject"], message: "Email templates require a subject." }); if (value.channel === "sms" && value.body.length > 1600) ctx.addIssue({ code: "custom", path: ["body"], message: "SMS templates must be 1,600 characters or fewer." }); });
