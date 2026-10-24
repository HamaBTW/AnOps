import { z } from "zod";

export const createCompanySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Company name must be at least 2 characters")
    .max(80, "Company name cannot exceed 80 characters"),
  currency: z.string().trim().default("TND"),
  industry: z.string().trim().optional(),
});

export type CreateCompanySchema = z.infer<typeof createCompanySchema>;
