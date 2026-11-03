"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAuthUser } from "@/server/auth/rbac";
import { getActiveTenant } from "@/server/tenant/context";
import { ai } from "@/server/ai";
import {
  workerRentalCreateSchema,
  workerRentalUpdateSchema,
  workerRentalTimesheetSchema,
  workerRentalPaymentSchema,
} from "@/features/hr/schemas/worker-rental.schema";
import {
  createWorkerRentalAgreement,
  updateWorkerRentalAgreement,
  deleteWorkerRentalAgreement,
  logWorkerRentalTimesheet,
  deleteWorkerRentalTimesheet,
  recordWorkerRentalPayment,
  deleteWorkerRentalPayment,
  getWorkerRentalAgreementById,
} from "@/server/services/worker-rental.service";

export type ActionResult<T = unknown> = { success?: boolean; error?: string; data?: T };

export async function createWorkerRentalAction(
  input: FormData | Record<string, any>
): Promise<ActionResult<{ id: string; agreementNumber: string }>> {
  try {
    const auth = await getCurrentAuthUser();
    if (!auth) return { error: "Unauthorized" };

    const tenant = await getActiveTenant();
    if (!tenant) return { error: "No active company" };

    const raw = input instanceof FormData ? Object.fromEntries(input.entries()) : input;
    const parsed = workerRentalCreateSchema.safeParse(raw);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input data" };
    }

    const res = await createWorkerRentalAgreement(tenant.companyId, parsed.data, auth.userId);
    revalidatePath("/hr/rentals");
    revalidatePath("/hr");
    return { success: true, data: res };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create worker rental agreement";
    return { error: msg };
  }
}

export async function updateWorkerRentalAction(
  id: string,
  input: FormData | Record<string, any>
): Promise<ActionResult> {
  try {
    const auth = await getCurrentAuthUser();
    if (!auth) return { error: "Unauthorized" };

    const tenant = await getActiveTenant();
    if (!tenant) return { error: "No active company" };

    const raw = input instanceof FormData ? Object.fromEntries(input.entries()) : input;
    const parsed = workerRentalUpdateSchema.safeParse(raw);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input data" };
    }

    const success = await updateWorkerRentalAgreement(tenant.companyId, id, parsed.data, auth.userId);
    if (!success) return { error: "Agreement not found or update failed" };

    revalidatePath("/hr/rentals");
    revalidatePath(`/hr/rentals/${id}`);
    revalidatePath("/hr");
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update worker rental agreement";
    return { error: msg };
  }
}

export async function deleteWorkerRentalAction(id: string): Promise<ActionResult> {
  try {
    const auth = await getCurrentAuthUser();
    if (!auth) return { error: "Unauthorized" };

    const tenant = await getActiveTenant();
    if (!tenant) return { error: "No active company" };

    await deleteWorkerRentalAgreement(tenant.companyId, id);
    revalidatePath("/hr/rentals");
    revalidatePath("/hr");
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to delete worker rental agreement";
    return { error: msg };
  }
}

export async function logRentalTimesheetAction(
  input: FormData | Record<string, any>
): Promise<ActionResult<{ id: string }>> {
  try {
    const auth = await getCurrentAuthUser();
    if (!auth) return { error: "Unauthorized" };

    const tenant = await getActiveTenant();
    if (!tenant) return { error: "No active company" };

    const raw = input instanceof FormData ? Object.fromEntries(input.entries()) : input;
    const parsed = workerRentalTimesheetSchema.safeParse(raw);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid timesheet data" };
    }

    const res = await logWorkerRentalTimesheet(tenant.companyId, parsed.data, auth.userId);
    revalidatePath(`/hr/rentals/${parsed.data.agreementId}`);
    revalidatePath("/hr/rentals");
    revalidatePath("/hr");
    return { success: true, data: res };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to log timesheet";
    return { error: msg };
  }
}

export async function deleteRentalTimesheetAction(
  id: string,
  agreementId: string
): Promise<ActionResult> {
  try {
    const auth = await getCurrentAuthUser();
    if (!auth) return { error: "Unauthorized" };

    const tenant = await getActiveTenant();
    if (!tenant) return { error: "No active company" };

    await deleteWorkerRentalTimesheet(tenant.companyId, id);
    revalidatePath(`/hr/rentals/${agreementId}`);
    revalidatePath("/hr/rentals");
    revalidatePath("/hr");
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to delete timesheet";
    return { error: msg };
  }
}

export async function recordRentalPaymentAction(
  input: FormData | Record<string, any>
): Promise<ActionResult<{ id: string }>> {
  try {
    const auth = await getCurrentAuthUser();
    if (!auth) return { error: "Unauthorized" };

    const tenant = await getActiveTenant();
    if (!tenant) return { error: "No active company" };

    const raw = input instanceof FormData ? Object.fromEntries(input.entries()) : input;
    const parsed = workerRentalPaymentSchema.safeParse(raw);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid payment data" };
    }

    const res = await recordWorkerRentalPayment(tenant.companyId, parsed.data, auth.userId);
    revalidatePath(`/hr/rentals/${parsed.data.agreementId}`);
    revalidatePath("/hr/rentals");
    revalidatePath("/hr");
    return { success: true, data: res };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to record payment";
    return { error: msg };
  }
}

export async function deleteRentalPaymentAction(
  id: string,
  agreementId: string
): Promise<ActionResult> {
  try {
    const auth = await getCurrentAuthUser();
    if (!auth) return { error: "Unauthorized" };

    const tenant = await getActiveTenant();
    if (!tenant) return { error: "No active company" };

    await deleteWorkerRentalPayment(tenant.companyId, id);
    revalidatePath(`/hr/rentals/${agreementId}`);
    revalidatePath("/hr/rentals");
    revalidatePath("/hr");
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to delete payment";
    return { error: msg };
  }
}

export async function generateRentalAgreementDocAction(
  agreementId: string,
  language: "fr" | "en" = "fr"
): Promise<ActionResult<{ agreementHtml: string; title: string }>> {
  try {
    const auth = await getCurrentAuthUser();
    if (!auth) return { error: "Unauthorized" };

    const tenant = await getActiveTenant();
    if (!tenant) return { error: "No active company" };

    const agreement = await getWorkerRentalAgreementById(tenant.companyId, agreementId);
    if (!agreement) return { error: "Agreement not found" };

    const systemPrompt = `You are a corporate legal specialist in employment law, subcontracting agreements, and inter-company personnel secondment (mise à disposition de personnel).
Generate a formal, professional legal agreement document in ${language === "fr" ? "French" : "English"} format.
The document should include:
1. Header with Agreement Number, Date, and Parties (Company A as host/client or lending company, Company B as lending/host partner).
2. Preamble & Subject of Agreement (Temporary assignment of skilled personnel).
3. Identification of the Assigned Worker (Name, Role, Qualifications).
4. Mission Duration, Start Date, End Date, and Work Location/Department.
5. Invoicing & Financial Compensation Terms (Billing Rate, Payment Schedule).
6. Administrative Status, Insurance, Workplace Safety & Confidentiality.
7. Signatures block for both authorized corporate representatives and the employee acknowledgment.

Output clean formatted Markdown (with clear headers, tables, and signature lines).`;

    const userPrompt = `Agreement Details:
- Agreement Number: ${agreement.agreementNumber}
- Type: ${agreement.type === "rent_in" ? "Company A is Renting/Hosting the Worker from Company B" : "Company A is Lending the Worker to Company B"}
- Host Company: ${agreement.type === "rent_in" ? tenant.company.name || "Our Company" : agreement.partnerCompanyName}
- Lending Company: ${agreement.type === "rent_in" ? agreement.partnerCompanyName : tenant.company.name || "Our Company"}
- Partner Contact: ${agreement.partnerContactPerson || "Executive Representative"} (${agreement.partnerEmail || "contact@partner.com"})
- Assigned Worker: ${agreement.workerName}
- Role/Specialty: ${agreement.workerRole}
- Start Date: ${agreement.startDate}
- End Date: ${agreement.endDate}
- Rate: ${agreement.unitRate} ${agreement.currency} per ${agreement.rateType}
- Estimated Total Units: ${agreement.estimatedUnits}
- Estimated Total: ${agreement.estimatedTotal} ${agreement.currency}
- Department: ${agreement.departmentName || "Engineering & Operations"}
- Supervisor: ${agreement.supervisorName || "Project Director"}`;

    const raw = await ai.ask(userPrompt, systemPrompt);
    const title = language === "fr"
      ? `Convention de Mise à Disposition - ${agreement.agreementNumber}`
      : `Personnel Secondment Agreement - ${agreement.agreementNumber}`;

    return {
      success: true,
      data: {
        agreementHtml: raw,
        title,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to draft agreement";
    return { error: msg };
  }
}

