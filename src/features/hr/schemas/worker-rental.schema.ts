import { z } from "zod";

export const workerRentalCreateSchema = z.object({
  type: z.enum(["rent_in", "lend_out"]).default("rent_in"),
  workerName: z.string().trim().min(2, "Worker name is required"),
  workerEmail: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  workerPhone: z.string().trim().optional().or(z.literal("")),
  workerRole: z.string().trim().min(2, "Worker role / skill is required"),
  workerNationalId: z.string().trim().optional().or(z.literal("")),
  internalEmployeeId: z.string().trim().optional().or(z.literal("")),

  partnerCompanyName: z.string().trim().min(2, "Partner company name is required"),
  partnerContactPerson: z.string().trim().optional().or(z.literal("")),
  partnerEmail: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  partnerPhone: z.string().trim().optional().or(z.literal("")),
  partnerTaxId: z.string().trim().optional().or(z.literal("")),

  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be YYYY-MM-DD"),
  rateType: z.enum(["hourly", "daily", "monthly", "fixed"]).default("daily"),
  unitRate: z.coerce.number().positive("Unit rate must be positive"),
  currency: z.string().trim().default("TND"),
  estimatedUnits: z.coerce.number().min(0).default(0),

  departmentId: z.string().trim().optional().or(z.literal("")),
  departmentName: z.string().trim().optional().or(z.literal("")),
  supervisorName: z.string().trim().optional().or(z.literal("")),
  projectReference: z.string().trim().optional().or(z.literal("")),

  status: z.enum(["draft", "active", "completed", "terminated"]).default("active"),
  notes: z.string().trim().optional().or(z.literal("")),
});

export const workerRentalUpdateSchema = workerRentalCreateSchema.partial();

export const workerRentalTimesheetSchema = z.object({
  agreementId: z.string().trim().min(1, "Agreement ID is required"),
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Work date must be YYYY-MM-DD"),
  unitsWorked: z.coerce.number().positive("Units worked must be positive"),
  overtimeHours: z.coerce.number().min(0).default(0),
  taskDescription: z.string().trim().optional().or(z.literal("")),
  approvedBy: z.string().trim().optional().or(z.literal("")),
});

export const workerRentalPaymentSchema = z.object({
  agreementId: z.string().trim().min(1, "Agreement ID is required"),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Payment date must be YYYY-MM-DD"),
  amount: z.coerce.number().positive("Payment amount must be positive"),
  currency: z.string().trim().default("TND"),
  paymentMethod: z.enum(["bank_transfer", "check", "cash"]).default("bank_transfer"),
  recipientType: z.enum(["worker", "partner_company"]).default("partner_company"),
  recipientName: z.string().trim().min(2, "Recipient name is required"),
  reference: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
});

