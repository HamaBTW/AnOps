import "server-only";

import { BaseAgent } from "@/server/ai/base-agent";
import type { AgentContext } from "@/server/ai/base-agent";
import type { AiMessage } from "@/server/ai/types";
import { COMPANY_POLICIES } from "@/features/hr/policies/company-policies";
import {
  getSoldeDeConge,
  getLeaveBalance,
  getLeaveRequests,
  getEmployeeById,
  getEmployeeLeavePolicy,
} from "@/server/services/hr.service";

/**
 * Context the HR Assistant receives per chat turn.
 * All fields are optional — the agent degrades gracefully.
 */
export type HRAssistantContext = AgentContext & {
  employeeId?: string;
  companyId?: string;
};

const HR_SYSTEM_PROMPT = `
You are AnOps HR Assistant, an expert AI embedded in the AnOps HR & Payroll platform.

## Your Role & Domain Expertise
You answer questions about:
- **Solde de congé & Paid Leave**: Tunisian Labour Code (Articles 113–114) ledger-based leave system:
  - Monthly accrual (*mensualisation*): 1.0 day/month of effective work for standard adults (cap 15 calendar / 12 working days), 1.5 days/month for ages 18–20, 2.0 days/month for under 18.
  - Leave ledger lifecycle: Approved leave is a **RESERVATION** first; it becomes **TAKEN** only when the leave dates elapse. Cancelled leaves are **RELEASED**.
  - Balance formula: \`Available = Earned - Taken - Reserved + Adjustments\`.
  - Unused leave on departure: Potential *Indemnité compensatrice de congé payé* (\`Earned - Taken\`), subject to legal/collective agreement verification (Art. 120 gross misconduct exception).
  - *Disclaimer note*: Always remind the employee that statutory rates are standard baselines and to "verify with HR/legal".
- **Company HR Policies**: Sick leave medical certificates, working hours (40h/wk, flex window 8:30-9:30 AM), attendance punch system, family leave.
- **Personal Employee Data**: When provided in context, quote their exact real-time Solde breakdown (Acquis/Earned, Pris/Taken, Réservé/Reserved, Disponible/Available).
- **Payroll & Deductions**: Base salary minus unpaid leave deductions: \`daily_rate = base_salary / 22\`, \`deduction = daily_rate * unpaid_leave_days\`.
- **Language**: Fluent in English and French. Use standard terms: *Solde de congé*, *Demande de congé*, *Congés payés*, *Indemnité compensatrice de congé payé*.

## Core Rules
1. **Be grounded** — Only answer from the policies and employee data provided in context. Never invent numbers.
2. **Be precise** — Quote policy sections by name (e.g. Code du Travail Art. 113-114).
3. **Be concise** — Use bullet points and markdown headers for clarity.
4. **Personalise** — If employee data is provided, use the employee's name and real figures.
5. **Redirect out-of-scope queries** — If asked about something outside HR, politely explain your scope.
6. **Format numbers** — Always show salary in TND, leave in days.

## Interactive Navigation & Action Links
When directing the user to HR sections or suggesting actions, ALWAYS use these clickable action links:
- To view leave balance: [View Leave Balance](#action:view-leave-balance)
- To submit a leave request: [Submit Leave Request](#action:submit-leave-request)
- To view attendance records: [View Attendance](#action:view-attendance)
- To view payslips & payroll: [View Payroll](#action:view-payroll)

Example:
"You can view your exact balance in the [View Leave Balance](#action:view-leave-balance) section or [Submit Leave Request](#action:submit-leave-request) whenever you need time off."
`.trim();

/**
 * HRAssistantAgent — extends BaseAgent for AnOps HR questions.
 *
 * What it adds over the base:
 * - Injects all company policy documents into context (Solde de congé & Tunisian rules)
 * - Fetches the employee's live Solde de congé breakdown (Earned, Taken, Reserved, Available)
 * - Attaches structured tool data to responses for interactive UI cards
 */
export class HRAssistantAgent extends BaseAgent {
  constructor() {
    super({
      name: "HR Policy & Leave Assistant",
      description: "Answers HR policy questions and retrieves real-time leave, attendance, and payroll data.",
      systemPrompt: HR_SYSTEM_PROMPT,
      defaults: {
        maxTokens: 1024,
        temperature: 0.3, // Lower = more factual, less hallucination
      },
    });
  }

  /**
   * Enriches the user message with:
   * 1. All company policy documents (always)
   * 2. The employee's real-time Solde de congé ledger balance
   * 3. Employee profile data & active policy rules
   */
  protected override async enrichContext(
    _userMessage: string,
    context?: HRAssistantContext
  ): Promise<string | null> {
    const parts: string[] = [];

    // ── 1. Policy library ──────────────────────────────────────────────
    parts.push("## Company HR Policy Documents\n");
    for (const policy of COMPANY_POLICIES) {
      parts.push(`### ${policy.title}\n${policy.content}\n`);
    }

    // ── 2. Employee data ───────────────────────────────────────────────
    if (context?.employeeId && context.companyId) {
      try {
        const emp = await getEmployeeById(context.employeeId, context.companyId);
        if (emp) {
          parts.push(`\n## Employee Profile (current user context)\n`);
          parts.push(`- **Name**: ${emp.fullName}`);
          parts.push(`- **Job Title**: ${emp.jobTitle}`);
          parts.push(`- **Department**: ${emp.departmentName}`);
          parts.push(`- **Base Salary**: ${emp.baseSalary.toLocaleString()} TND`);
          parts.push(`- **Daily Rate**: ${(emp.baseSalary / 22).toFixed(2)} TND`);
          parts.push(`- **Hire Date**: ${emp.hireDate}`);
          if (emp.dateOfBirth) {
            parts.push(`- **Date of Birth**: ${emp.dateOfBirth}`);
          }
        }

        // ── 3. Live Solde de Congé Breakdown ──────────────────────────────
        const currentYear = new Date().getFullYear();
        const [solde, allRequests, activePolicy] = await Promise.all([
          getSoldeDeConge(context.employeeId, currentYear, context.companyId),
          getLeaveRequests({ employeeId: context.employeeId }, context.companyId),
          getEmployeeLeavePolicy(context.employeeId, context.companyId),
        ]);

        const pending = allRequests.filter((r) => r.status === "pending");
        const activeApproved = allRequests.filter((r) => r.status === "approved");

        parts.push(`\n## Real-Time Solde de Congé (${currentYear})`);
        parts.push(`- **Applicable Policy**: ${activePolicy?.name || "Standard Adult Policy"}`);
        parts.push(`- **Legal Reference**: ${activePolicy?.legalReference || "Code du Travail Art. 113-114"}`);
        parts.push(`- **Accrual Rate**: ${activePolicy?.accrualRate ?? 1.0} day(s)/month (Cap: ${activePolicy?.annualCap ?? 15} days)`);
        parts.push(`- **Earned (Acquis)**: ${solde.earned} days`);
        parts.push(`- **Taken (Pris)**: ${solde.taken} days`);
        parts.push(`- **Reserved (Réservé)**: ${solde.reserved} days (approved future leaves)`);
        if (solde.adjustments !== 0) {
          parts.push(`- **Adjustments**: ${solde.adjustments > 0 ? "+" : ""}${solde.adjustments} days`);
        }
        parts.push(`- **Available Balance (Disponible)**: **${solde.available} days**`);
        parts.push(`- **Unpaid Leave Taken**: ${solde.unpaidDaysTaken} days`);

        // Attach structured metadata so the UI can render rich interactive action cards
        if (context) {
          context._metadata = {
            type: "leave_balance",
            data: {
              earned: solde.earned,
              taken: solde.taken,
              reserved: solde.reserved,
              adjustments: solde.adjustments,
              available: solde.available,
              unpaidDaysTaken: solde.unpaidDaysTaken,
              policyName: activePolicy?.name,
              legalReference: activePolicy?.legalReference,
            },
          };
        }

        if (pending.length > 0) {
          parts.push(`\n## Pending Leave Requests (${pending.length})`);
          for (const r of pending) {
            parts.push(`- ${r.leaveType} | ${r.startDate} → ${r.endDate} (${r.days} days) | Reason: ${r.reason}`);
          }
        }

        if (activeApproved.length > 0) {
          parts.push(`\n## Approved Upcoming / Active Leaves (${activeApproved.length})`);
          for (const r of activeApproved.slice(0, 5)) {
            parts.push(`- ${r.leaveType} | ${r.startDate} → ${r.endDate} (${r.days} days) [RESERVED in Solde]`);
          }
        }
      } catch (err) {
        console.warn("[HRAssistantAgent] Failed to load employee context:", err);
        // Non-fatal — agent still answers from policies
      }
    }

    return parts.join("\n");
  }

  /**
   * Keeps the context section from getting too large — trim policy text
   * if the conversation history is already long.
   */
  protected override async beforeComplete(
    messages: AiMessage[],
    _context?: HRAssistantContext
  ): Promise<AiMessage[]> {
    const system = messages.filter((m) => m.role === "system");
    const convo = messages.filter((m) => m.role !== "system");
    const trimmedConvo = convo.slice(-10);
    return [...system, ...trimmedConvo];
  }
}
