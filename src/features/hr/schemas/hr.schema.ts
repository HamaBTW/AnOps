import { z } from "zod";

export const employeeSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(80, "Full name must be at most 80 characters"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid work email address"),
  phone: z
    .string()
    .trim()
    .max(25, "Phone number is too long")
    .optional()
    .or(z.literal("")),
  departmentId: z
    .string()
    .min(1, "Please select a department"),
  jobTitle: z
    .string()
    .trim()
    .min(2, "Job title is required")
    .max(80, "Job title is too long"),
  isCustomJobTitle: z.boolean().optional().default(false),
  hireDate: z
    .string()
    .min(1, "Hire date is required"),
  baseSalary: z.coerce
    .number({ message: "Base salary must be a valid number" })
    .min(0, "Base salary cannot be negative"),
  role: z.enum(["employee", "manager", "hr_admin"]).default("employee"),
  status: z.enum(["active", "inactive"]).default("active"),
  leaveAllowance: z.coerce
    .number()
    .min(0, "Leave allowance cannot be negative")
    .default(25),
});

export const jobTitleSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Job title must be at least 2 characters")
    .max(80, "Job title is too long"),
  departmentId: z.string().optional(),
});

export const departmentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Department name must be at least 2 characters")
    .max(60, "Department name is too long"),
  description: z.string().trim().max(250).optional(),
});

export type EmployeeInput = z.infer<typeof employeeSchema>;
export type JobTitleInput = z.infer<typeof jobTitleSchema>;
export type DepartmentInput = z.infer<typeof departmentSchema>;
