import "server-only";

import { BaseAgent } from "@/server/ai/base-agent";
import type { AgentContext } from "@/server/ai/base-agent";
import type { AiMessage } from "@/server/ai/types";
import { COMPANY_POLICIES } from "@/features/hr/policies/company-policies";
import { getLeaveBalance, getLeaveRequests, getEmployeeById } from "@/server/services/hr.service";

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

## Your Role
You answer questions about:
- Company HR policies (leave, attendance, payroll, sick leave, maternity/paternity)
- An employee's personal leave balance and pending requests
- Payroll and salary deduction calculations
- Attendance procedures and working hours

## Core Rules
1. **Be grounded** — Only answer from the policies and employee data provided in context. Never invent numbers.
2. **Be precise** — Quote policy sections by name when relevant.
3. **Be concise** — Use bullet points and markdown headers for clarity.
4. **Personalise** — If employee data is provided, use the employee's name and real figures.
5. **Redirect out-of-scope queries** — If asked about something outside HR, politely explain your scope.
6. **Format numbers** — Always show salary in TND, leave in days.

## Tone
Professional, warm, and helpful. Address the employee by name when you know it.

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
 * - Injects all company policy documents into context
 * - Fetches the employee's live leave balance before each response
 * - Attaches structured tool data (leave_balance, payroll_calculation) to responses
 */
export class HRAssistantAgent extends BaseAgent {
  constructor() {
    super({
      name: "HR Policy & Leave Assistant",
      description: "Answers HR policy questions and retrieves real-time leave, attendance, and payroll data.",
      systemPrompt: HR_SYSTEM_PROMPT,
      defaults: {
        maxTokens: 1024,
        temperature: 0.4, // Lower = more factual, less hallucination
      },
    });
  }

  /**
   * Enriches the user message with:
   * 1. All company policy documents (always)
   * 2. The employee's real-time leave balance (when employeeId is available)
   * 3. Employee profile data
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
    if (context?.employeeId) {
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
          parts.push(`- **Leave Allowance**: ${emp.leaveAllowance} days/year`);
        }

        // ── 3. Live leave balance ──────────────────────────────────────
        const currentYear = new Date().getFullYear();
        const [balance, allRequests] = await Promise.all([
          getLeaveBalance(context.employeeId, currentYear, context.companyId),
          getLeaveRequests({ employeeId: context.employeeId }, context.companyId),
        ]);

        const pending = allRequests.filter((r) => r.status === "pending");
        const recentApproved = allRequests
          .filter((r) => r.status === "approved")
          .slice(0, 5);

        parts.push(`\n## Real-Time Leave Balance (${currentYear})`);
        parts.push(`- Annual Allowance: ${balance.allowance} days`);
        parts.push(`- Used Paid Leave: ${balance.usedPaidDays} days`);
        parts.push(`- **Remaining Balance: ${balance.remainingDays} days**`);
        parts.push(`- Unpaid Leave Taken: ${balance.unpaidDaysTaken} days`);

        // Attach structured metadata so the UI can render rich interactive action cards
        if (context) {
          context._metadata = {
            type: "leave_balance",
            data: {
              allowance: balance.allowance,
              usedPaidDays: balance.usedPaidDays,
              remainingDays: balance.remainingDays,
              unpaidDaysTaken: balance.unpaidDaysTaken,
            },
          };
        }

        if (pending.length > 0) {
          parts.push(`\n## Pending Leave Requests (${pending.length})`);
          for (const r of pending) {
            parts.push(`- ${r.leaveType} | ${r.startDate} → ${r.endDate} (${r.days} days) | Reason: ${r.reason}`);
          }
        }

        if (recentApproved.length > 0) {
          parts.push(`\n## Recent Approved Leave Requests`);
          for (const r of recentApproved) {
            parts.push(`- ${r.leaveType} | ${r.startDate} → ${r.endDate} (${r.days} days)`);
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
    // Limit total conversation history to last 10 turns to stay within token limits
    const system = messages.filter((m) => m.role === "system");
    const convo = messages.filter((m) => m.role !== "system");
    const trimmedConvo = convo.slice(-10);
    return [...system, ...trimmedConvo];
  }
}
