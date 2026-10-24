import { z } from "zod";

const email = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email address")
  .transform((val) => val.toLowerCase());

const name = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name must be at most 100 characters");

const jobTitle = z
  .string()
  .trim()
  .min(1, "Job title is required")
  .max(100, "Job title must be at most 100 characters");

const baseSalary = z
  .number()
  .min(0, "Base salary must be at least 0")
  .max(1000000, "Base salary is too high");

const role = z.enum(["employee", "admin"]);

const status = z.enum(["active", "inactive"]);

export const employeeSchema = z.object({
  name,
  email,
  jobTitle,
  baseSalary,
  role,
  status,
});

export const updateEmployeeSchema = employeeSchema
  .partial()
  .extend({ id: z.string().min(1, "Employee ID is required") });

export const deactivateEmployeeSchema = z.object({
  id: z.string().min(1, "Employee ID is required"),
});

export type EmployeeInput = z.infer<typeof employeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type DeactivateEmployeeInput = z.infer<typeof deactivateEmployeeSchema>;

export type EmployeeRole = z.infer<typeof role>;
export type EmployeeStatus = z.infer<typeof status>;

export type Employee = EmployeeInput & {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
};