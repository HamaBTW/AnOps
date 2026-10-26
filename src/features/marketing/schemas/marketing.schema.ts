import { z } from "zod";
import { lifecycleStages, marketingChannels } from "@/features/marketing/types";

export const contactInputSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(80),
  lastName: z.string().trim().min(1, "Last name is required.").max(80),
  email: z.string().trim().email("Enter a valid email.").max(254).optional().or(z.literal("")),
  phone: z.string().trim().max(32).optional().or(z.literal("")),
  source: z.string().trim().min(1, "Lead source is required.").max(80),
  lifecycleStage: z.enum(lifecycleStages),
  tagIds: z.array(z.string().regex(/^[a-f0-9]{24}$/i, "Invalid tag ID")).max(50).default([]),
});

export const contactUpdateSchema = contactInputSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const contactQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(80).default(""),
  lifecycleStage: z.enum(lifecycleStages).optional(),
  source: z.string().trim().max(80).optional(),
  tagId: z.string().regex(/^[a-f0-9]{24}$/i).optional(),
  active: z.enum(["true", "false", "all"]).default("true"),
  sort: z.enum(["createdAt", "name", "updatedAt"]).default("createdAt"),
  direction: z.enum(["asc", "desc"]).default("desc"),
});

export const tagInputSchema = z.object({
  name: z.string().trim().min(1, "Tag name is required.").max(50),
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Color must be a valid hex code (e.g. #c8f03e)").default("#c8f03e"),
});

export const consentRecordSchema = z.object({
  channel: z.enum(marketingChannels),
  purpose: z.string().trim().min(1, "Purpose is required.").max(120),
  status: z.enum(["granted", "revoked"]),
  source: z.string().trim().min(1, "Consent source is required.").max(120),
});

export const audienceSelectionRuleSchema = z.object({
  activeOnly: z.boolean().default(true),
  lifecycleStages: z.array(z.enum(lifecycleStages)).optional(),
  sources: z.array(z.string().trim().min(1).max(80)).optional(),
  tagIds: z.array(z.string().regex(/^[a-f0-9]{24}$/i)).optional(),
  requireConsentChannel: z.enum(marketingChannels).optional(),
  requireConsentPurpose: z.string().trim().max(120).optional(),
});

export const audienceInputSchema = z.object({
  name: z.string().trim().min(1, "Audience name is required.").max(120),
  description: z.string().trim().max(500).default(""),
  selectionRule: audienceSelectionRuleSchema.optional(),
});

export const membershipSchema = z.object({
  contactId: z.string().regex(/^[a-f0-9]{24}$/i, "Invalid contact ID"),
});

export const templateInputSchema = z
  .object({
    name: z.string().trim().min(1, "Template name is required.").max(160),
    description: z.string().trim().max(500).default(""),
    channel: z.enum(marketingChannels),
    subject: z.string().trim().max(240).optional().or(z.literal("")),
    body: z.string().trim().min(1, "Template body is required.").max(10000),
  })
  .superRefine((value, ctx) => {
    if (value.channel === "email" && !value.subject) {
      ctx.addIssue({ code: "custom", path: ["subject"], message: "Email templates require a subject." });
    }
    if (value.channel === "sms" && value.body.length > 1600) {
      ctx.addIssue({ code: "custom", path: ["body"], message: "SMS templates must be 1,600 characters or fewer." });
    }
  });

export const campaignInputSchema = z.object({
  name: z.string().trim().min(1, "Campaign name is required.").max(160),
  channel: z.enum(marketingChannels),
  subject: z.string().trim().max(240).optional().or(z.literal("")),
  body: z.string().trim().min(1, "Campaign message body is required.").max(10000),
  audienceId: z.string().regex(/^[a-f0-9]{24}$/i, "Valid audience is required"),
  templateId: z.string().regex(/^[a-f0-9]{24}$/i).optional(),
  scheduledAt: z.string().datetime({ offset: true }).optional(),
});

export const campaignCommandSchema = z.object({
  command: z.enum(["submit", "approve", "reject", "schedule", "dispatch", "cancel", "retry"]),
});

export type ContactInput = z.infer<typeof contactInputSchema>;
export type ContactQuery = z.infer<typeof contactQuerySchema>;
export type TagInput = z.infer<typeof tagInputSchema>;
export type ConsentInput = z.infer<typeof consentRecordSchema>;
export type AudienceInput = z.infer<typeof audienceInputSchema>;
export type TemplateInput = z.infer<typeof templateInputSchema>;
export type CampaignInput = z.infer<typeof campaignInputSchema>;
