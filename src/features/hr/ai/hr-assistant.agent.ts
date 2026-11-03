import "server-only";

import { BaseAgent } from "@/server/ai/base-agent";
import type { AgentContext } from "@/server/ai/base-agent";
import type { AiMessage } from "@/server/ai/types";
import { COMPANY_POLICIES } from "@/features/hr/policies/company-policies";
import {
  getSoldeDeConge,
  getLeaveRequests,
  getEmployeeById,
  getEmployeeLeavePolicy,
  getLeaveTransactions,
} from "@/server/services/hr.service";
import clientPromise from "@/server/db/client";
import { ObjectId } from "mongodb";

/**
 * Context the HR Assistant receives per chat turn.
 * All fields are optional — the agent degrades gracefully.
 */
export type HRAssistantContext = AgentContext & {
  employeeId?: string;
  companyId?: string;
  isAdmin?: boolean;
  userRole?: string;
  userEmployeeId?: string;
  userFullName?: string;
  userEmail?: string;
};

const HR_SYSTEM_PROMPT = `
You are AnOps HR Assistant, an expert AI embedded in the AnOps HR & People Operations platform.

## Your Role & Domain Expertise
You provide accurate, legally grounded answers about:
- **Solde de congé & Paid Leave**: Tunisian Labour Code (Articles 113–114) ledger-based leave system:
  - Monthly accrual (*mensualisation*):
    - Age >= 21 (Standard Adults): 1.0 day/month of effective work (statutory baseline cap: 15 calendar days / 12 working days).
    - Age 18–20 (Young Adults): 1.5 days/month of effective work (statutory cap: 22.5 calendar days / 18 working days).
    - Under 18 (Youth): 2.0 days/month of effective work (statutory cap: 30 calendar days / 24 working days).
  - Leave ledger lifecycle:
    - Approved leave creates an immediate **RESERVATION**, locking the balance.
    - When scheduled leave dates elapse, it becomes confirmed **TAKEN**.
    - If cancelled, a **RELEASE** restores the balance.
    - Balance formula: \`Available = Earned - Taken - Reserved + Adjustments\`.
  - **Step-by-Step Derivation Explanation**:
    When asked how the balance or leave was counted/calculated (or "how was it counted", "explain the calculation", "breakdown"):
    1. **Accrual Basis**: Explain the effective working months in the year × monthly accrual rate under Art. 113–114 = Total Earned (Acquis).
    2. **Taken Usage**: Detail the past consumed leaves = Total Taken (Pris).
    3. **Active Reservations**: Detail the approved upcoming leaves currently locking balance = Total Reserved (Réservé).
    4. **Net Available Balance**: Show the arithmetic: \`Earned - Taken - Reserved + Adjustments = Available\`.
    5. **Departure Compensation**: Detail the potential *Indemnité compensatrice de congé payé* (\`Earned - Taken\`) under Tunisian Labour Code Art. 120 (subject to legal verification and gross misconduct exception).
- **Payroll & Deductions**:
  - Daily rate formula: \`daily_rate = base_salary / 22 working days\`.
  - Unpaid leave deduction: \`deduction = daily_rate * unpaid_leave_days\`.
  - Net take-home salary formula: \`net_salary = base_salary - deduction\`.
- **Company HR Policies**: Sick leave certificates (required for >2 consecutive business days within 48h), working hours (40h/week, 8:30–9:30 AM flex window), attendance punch system, family leave allowances (maternity 60d, paternity 5d, bereavement 3d).
- **Roles, Permissions & Data Isolation (docs/ROLES_AND_PERMISSIONS.md)**:
  - **Admin / HR Admin**: Authorized to query any employee in the company. If the queried employee is found, report their data and breakdown. If not found in company records, clearly report that they were not found.
  - **Standard Employee**: Restricted to viewing ONLY their own records. If an employee asks about a colleague, peer, or another worker, you MUST REFUSE access with the specified access denied security message.
- **Language**: Fluent in English and French. Use standard terms: *Solde de congé*, *Demande de congé*, *Congés payés*, *Indemnité compensatrice de congé payé*.

## Core Rules
1. **NO RAW LATEX**: NEVER output raw LaTeX formatting such as brackets, backslashes, textbf, text, sum, boxed, times, or frac. All math must be formatted using clean Markdown code blocks or clear Unicode text.
2. **Be grounded** — Only answer from the policies and employee data provided in context. Never invent numbers.
3. **Be precise** — Quote policy sections by name (e.g. Code du Travail Art. 113-114, Art. 120).
4. **Be structured & sequential** — When explaining calculations, always present the introduction at the TOP and follow this chronological sequence:
   - 1. Determine the Accrual Rate (Mensualisation — Art. 113–114)
   - 2. Compute Earned (Acquis)
   - 3. Subtract Taken (Pris)
   - 4. Subtract Reserved (Réservé)
   - 5. Add Adjustments (Adjustments)
   - 6. Derive Available Balance (Disponible)
   - 7. Unused Leave Departure Indemnity (Art. 120)
   - 8. Payroll Unpaid Leave Deduction (if applicable)
5. **Enforce Security** — If an access denied directive appears in context, strictly refuse access and do not disclose peer data.
6. **Format numbers** — Always show salary in TND, leave in days.

## Interactive Navigation & Action Links
When directing the user to HR sections or suggesting actions, ALWAYS use these clickable action links:
- To view leave balance: [View Leave Balance](#action:view-leave-balance)
- To submit a leave request: [Submit Leave Request](#action:submit-leave-request)
- To view attendance records: [View Attendance](#action:view-attendance)
- To view payslips & payroll: [View Payroll](#action:view-payroll)
`.trim();

/**
 * HRAssistantAgent — extends BaseAgent for AnOps HR questions.
 */
export class HRAssistantAgent extends BaseAgent {
  constructor() {
    super({
      name: "HR Policy & Leave Assistant",
      description: "Answers HR policy questions and retrieves real-time leave, attendance, and payroll data.",
      systemPrompt: HR_SYSTEM_PROMPT,
      defaults: {
        maxTokens: 1024,
        temperature: 0.25, // Factual, precise arithmetic
      },
    });
  }

  /**
   * Enriches the user message with:
   * 1. Company policy documents
   * 2. Targeted employee profile, Solde derivation, and ledger transactions
   * 3. RBAC security enforcement (docs/ROLES_AND_PERMISSIONS.md)
   */
  protected override async enrichContext(
    userMessage: string,
    context?: HRAssistantContext
  ): Promise<string | null> {
    const parts: string[] = [];

    // ── 1. Policy library ──────────────────────────────────────────────
    parts.push("## Company HR Policy Documents\n");
    for (const policy of COMPANY_POLICIES) {
      parts.push(`### ${policy.title}\n${policy.content}\n`);
    }

    if (!context?.companyId) {
      return parts.join("\n");
    }

    const companyId = context.companyId;
    const currentYear = new Date().getFullYear();

    try {
      const client = await clientPromise;
      const db = client.db();
      const cId = new ObjectId(companyId);

      // Fetch all employees in this active company for lookup & RBAC validation
      const companyEmployees = await db
        .collection("employees")
        .find({ companyId: cId })
        .toArray();

      const normalizedMsg = userMessage.toLowerCase().trim();

      // Check if user is asking about a specific employee
      let matchedEmployee: (typeof companyEmployees)[0] | null = null;
      for (const emp of companyEmployees) {
        const empName = (emp.fullName as string).toLowerCase();
        if (normalizedMsg.includes(empName)) {
          matchedEmployee = emp;
          break;
        }
        // Check distinct name parts (>= 3 chars)
        const nameParts = empName.split(/\s+/).filter((p) => p.length >= 3);
        const hasDistinctMatch = nameParts.some((p) => {
          const regex = new RegExp(`\\b${p}\\b`, "i");
          return regex.test(userMessage);
        });
        if (hasDistinctMatch) {
          matchedEmployee = emp;
          break;
        }
      }

      // Check if user searched for an employee who does NOT exist in company records
      let notFoundName: string | null = null;
      if (!matchedEmployee) {
        const patterns = [
          /(?:about|for|employee|check|status of|balance of|leave for|info on)\s+([A-Z][a-zA-Z\s'-]{2,25})/i,
          /([A-Z][a-zA-Z\s'-]{2,25})'s\s+(?:leave|balance|salary|payslip|data|status|conge)/i,
          /(?:does|is|can you check)\s+([A-Z][a-zA-Z\s'-]{2,25})\s+(?:exist|have|work)/i,
        ];
        for (const pat of patterns) {
          const m = userMessage.match(pat);
          if (m && m[1]) {
            const candidate = m[1].trim();
            const lower = candidate.toLowerCase();
            const blacklist = [
              "the", "my", "our", "anops", "leave", "balance", "solde", "unpaid",
              "sick", "holiday", "policy", "salary", "payroll", "manager", "admin",
              "hr", "doctor", "attendance", "new", "section"
            ];
            if (
              !blacklist.includes(lower) &&
              !companyEmployees.some((e) => (e.fullName as string).toLowerCase().includes(lower))
            ) {
              notFoundName = candidate;
              break;
            }
          }
        }
      }

      const isRequesterAdmin = Boolean(context.isAdmin || context.userRole === "hr_admin");

      // ── RBAC RULE: Non-admin inquiring about another person ───────────
      if (!isRequesterAdmin) {
        const isAskingAboutOther =
          (matchedEmployee && matchedEmployee._id.toString() !== context.userEmployeeId) ||
          notFoundName !== null ||
          /(?:other|another|colleague|coworker|peer|someone else)'s?\s+(?:data|leave|balance|salary|payslip)/i.test(
            userMessage
          );

        if (isAskingAboutOther) {
          parts.push(`\n## ⛔ CRITICAL ACCESS CONTROL VIOLATION — ACCESS DENIED`);
          parts.push(
            `The requesting user "${context.userFullName || context.userEmail}" is a regular employee (Role: ${
              context.userRole || "employee"
            }).`
          );
          parts.push(
            `Under AnOps security policies (docs/ROLES_AND_PERMISSIONS.md), regular employees are strictly restricted to their own personnel data.`
          );
          parts.push(
            `Inquiring about other employees or searching company records is FORBIDDEN.`
          );
          parts.push(`\nYOU MUST REFUSE THE REQUEST. Respond with:`);
          parts.push(
            `"⛔ **Access Denied**: In accordance with AnOps security and privacy policies (docs/ROLES_AND_PERMISSIONS.md), you are only authorized to view your own personal HR records, leave balances, and payslips. You do not have permission to view records for other employees. Please contact an HR Administrator if you require assistance."`
          );
          parts.push(`Do NOT disclose any employee records.`);
          return parts.join("\n");
        }
      }

      // ── ADMIN LOOKUP: Employee Not Found ──────────────────────────────
      if (isRequesterAdmin && notFoundName && !matchedEmployee) {
        parts.push(`\n## 🔍 EMPLOYEE LOOKUP RESULT: NOT FOUND`);
        parts.push(`The HR Administrator searched for employee "${notFoundName}".`);
        parts.push(
          `This employee does NOT exist in company records (${companyEmployees.length} registered employees checked).`
        );
        parts.push(`\nYOU MUST NOTIFY THE ADMINISTRATOR:`);
        parts.push(
          `"🔍 **Employee Not Found**: Employee **'${notFoundName}'** was not found in company records. Please verify the spelling or check the Employees directory to ensure they are registered in this organization."`
        );
        return parts.join("\n");
      }

      // ── Determine Target Employee to Load ─────────────────────────────
      let targetEmpId = context.employeeId;
      if (isRequesterAdmin && matchedEmployee) {
        targetEmpId = matchedEmployee._id.toString();
      } else if (!isRequesterAdmin) {
        targetEmpId = context.userEmployeeId || context.employeeId;
      }

      if (targetEmpId) {
        const emp = await getEmployeeById(targetEmpId, companyId);
        if (emp) {
          const isTargetOther = isRequesterAdmin && emp.id !== context.userEmployeeId;
          const label = isTargetOther
            ? `Admin Query Target Employee: ${emp.fullName}`
            : `Current Employee Context: ${emp.fullName}`;

          parts.push(`\n## ${label}`);
          parts.push(`- **Employee ID**: ${emp.id}`);
          parts.push(`- **Full Name**: ${emp.fullName}`);
          parts.push(`- **Job Title**: ${emp.jobTitle}`);
          parts.push(`- **Department**: ${emp.departmentName}`);
          parts.push(`- **Hire Date**: ${emp.hireDate}`);
          if (emp.dateOfBirth) {
            parts.push(`- **Date of Birth**: ${emp.dateOfBirth}`);
          }
          const dailyRate = Math.round((emp.baseSalary / 22) * 100) / 100;
          parts.push(`- **Base Salary**: ${emp.baseSalary.toLocaleString()} TND`);
          parts.push(`- **Daily Rate (Base ÷ 22)**: ${dailyRate.toFixed(2)} TND/day`);

          // Fetch Solde de Congé, policy, ledger transactions & leave requests
          const [solde, policy, requests, transactions] = await Promise.all([
            getSoldeDeConge(emp.id, currentYear, companyId),
            getEmployeeLeavePolicy(emp.id, companyId),
            getLeaveRequests({ employeeId: emp.id }, companyId),
            getLeaveTransactions({ employeeId: emp.id }, companyId),
          ]);

          const pendingRequests = requests.filter((r) => r.status === "pending");
          const approvedRequests = requests.filter((r) => r.status === "approved");

          // Calculate effective months worked in current year for explanation
          const hire = new Date(emp.hireDate);
          const now = new Date();
          let effectiveMonths = 11;
          if (hire.getFullYear() === currentYear) {
            effectiveMonths = Math.max(1, now.getMonth() - hire.getMonth() + 1);
          }

          parts.push(`\n## Step-by-Step Solde de Congé Derivation (${currentYear}) for ${emp.fullName}`);
          parts.push(`- **Active Policy**: ${policy?.name || "Standard Adult Policy"} (${policy?.legalReference || "Code du Travail Art. 113-114"})`);
          parts.push(`- **Accrual Rate**: ${policy?.accrualRate ?? 1.0} day(s)/month (Annual Cap: ${policy?.annualCap ?? 15} days)`);
          parts.push(`- **Effective Working Months in ${currentYear}**: ${effectiveMonths} month(s)`);
          parts.push(`- **Step 1 - Earned (Acquis)**: **${solde.earned} days** (${effectiveMonths} months × ${policy?.accrualRate ?? 1.0}d/mo)`);
          parts.push(`- **Step 2 - Taken (Pris)**: **${solde.taken} days** (past completed paid leaves)`);
          parts.push(`- **Step 3 - Reserved (Réservé)**: **${solde.reserved} days** (approved future leaves temporarily locking balance)`);
          if (solde.adjustments !== 0) {
            parts.push(`- **Step 4 - Adjustments**: **${solde.adjustments > 0 ? "+" : ""}${solde.adjustments} days**`);
          }
          parts.push(`- **Step 5 - Available Balance (Disponible)**: **${solde.available} days** [Equation: ${solde.earned} Earned - ${solde.taken} Taken - ${solde.reserved} Reserved + ${solde.adjustments} Adjustments = **${solde.available} days**]`);
          
          const unusedDays = Math.max(0, solde.earned - solde.taken);
          const compValue = Math.round(unusedDays * dailyRate * 100) / 100;
          parts.push(`- **Departure Compensation (Indemnité compensatrice Art. 120)**: **${unusedDays} unused days** (${solde.earned} Earned - ${solde.taken} Taken) = **${compValue.toLocaleString()} TND** (subject to legal verification)`);
          
          const unpaidDeduction = Math.round(solde.unpaidDaysTaken * dailyRate * 100) / 100;
          parts.push(`- **Unpaid Leave Taken (Payroll Deduction)**: **${solde.unpaidDaysTaken} days** = **${unpaidDeduction.toLocaleString()} TND** deducted from base salary [Formula: ${emp.baseSalary} ÷ 22 × ${solde.unpaidDaysTaken}]`);

          // Attach UI metadata card for this employee
          if (context) {
            context._metadata = {
              type: "leave_balance",
              data: {
                employeeName: emp.fullName,
                earned: solde.earned,
                taken: solde.taken,
                reserved: solde.reserved,
                adjustments: solde.adjustments,
                available: solde.available,
                unpaidDaysTaken: solde.unpaidDaysTaken,
                policyName: policy?.name,
                legalReference: policy?.legalReference,
              },
            };
          }

          // Ledger Transactions Summary
          if (transactions.length > 0) {
            parts.push(`\n### Recent Leave Ledger Transactions for ${emp.fullName}:`);
            for (const tx of transactions.slice(0, 8)) {
              parts.push(`- [${tx.effectiveDate}] **${tx.transactionType}**: ${tx.days > 0 ? "+" : ""}${tx.days} day(s) — ${tx.description}`);
            }
          }

          if (pendingRequests.length > 0) {
            parts.push(`\n### Pending Requests (${pendingRequests.length}):`);
            for (const r of pendingRequests) {
              parts.push(`- ${r.leaveType}: ${r.startDate} → ${r.endDate} (${r.days} days) [Awaiting Admin Approval]`);
            }
          }
          if (approvedRequests.length > 0) {
            parts.push(`\n### Approved Future Leaves (${approvedRequests.length}):`);
            for (const r of approvedRequests) {
              parts.push(`- ${r.leaveType}: ${r.startDate} → ${r.endDate} (${r.days} days) [Currently Reserved]`);
            }
          }
        }
      }
    } catch (err) {
      console.warn("[HRAssistantAgent] Error enriching context:", err);
    }

    return parts.join("\n");
  }

  /**
   * Keeps context bounded by trimming older conversation turns while keeping system prompt.
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
