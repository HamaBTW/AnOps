"use client";

import { Sparkles, ShieldCheck, BookOpen, X } from "lucide-react";
import { AgentChatPanel } from "@/shared/components/ai/agent-chat-panel";
import type { ChatMessage } from "@/shared/components/ai/agent-chat-panel";
import { chatWithHRAssistantAction } from "@/features/hr/actions/hr-assistant.action";
import { COMPANY_POLICIES } from "@/features/hr/policies/company-policies";
import type { Employee } from "@/features/hr/types";
import { useState } from "react";
import { Portal } from "@/shared/components/ui/portal";

type AIHRAssistantProps = {
  currentEmployee?: Employee | null;
  employees: Employee[];
};

const SUGGESTED_PROMPTS = [
  "How many leave days do I have left?",
  "How is unpaid leave deducted from my salary?",
  "What is the sick leave procedure?",
  "What are our official working hours?",
  "What is our maternity & paternity leave policy?",
];

const WELCOME_MESSAGE = `Hello! I'm your **AnOps HR Assistant** — powered by AI with access to your real-time HR data.

I can help you with:
- 🌴 **Leave balances** — your remaining annual leave and pending requests
- 💰 **Payroll & deductions** — how unpaid leave affects your salary
- ⏱️ **Working hours & attendance** — check-in rules and flexible arrival
- 📋 **HR policies** — sick leave, maternity, bereavement, and more

What would you like to know?`;

/**
 * AI HR Assistant panel — uses AgentChatPanel (shared UI) wired to
 * HRAssistantAgent (extends BaseAgent) via chatWithHRAssistantAction.
 */
export function AIHRAssistant({ currentEmployee, employees }: AIHRAssistantProps) {
  const [activeEmployeeId, setActiveEmployeeId] = useState(
    currentEmployee?.id ?? employees[0]?.id ?? ""
  );
  const [policyOpen, setPolicyOpen] = useState(false);
  const [selectedPolicyId, setSelectedPolicyId] = useState(COMPANY_POLICIES[0]?.id ?? "");

  const selectedPolicy = COMPANY_POLICIES.find((p) => p.id === selectedPolicyId);

  /** Bridge: AgentChatPanel → HR server action */
  const handleSend = async (userText: string, history: ChatMessage[]) => {
    const result = await chatWithHRAssistantAction({
      userMessage: userText,
      employeeId: activeEmployeeId,
      history: history.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        metadata: m.metadata,
      })),
    });

    if (!result.ok) {
      throw new Error(result.error);
    }

    return {
      text: result.response.message.content,
      metadata: result.response.message.metadata,
      provider: result.response.provider,
      model: result.response.model,
    };
  };

  const toolbar = (
    <div className="flex items-center gap-2">
      {/* Employee context switcher */}
      {employees.length > 1 && (
        <div className="flex items-center gap-1.5">
          <label className="text-[11px] font-bold text-[var(--color-text-secondary)]">
            Context:
          </label>
          <select
            value={activeEmployeeId}
            onChange={(e) => setActiveEmployeeId(e.target.value)}
            className="min-h-[34px] rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] px-2 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-action-primary)]"
          >
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.fullName}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Policy library button */}
      <button
        type="button"
        onClick={() => setPolicyOpen(true)}
        className="flex min-h-[36px] items-center gap-1.5 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-3 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] transition-colors shadow-xs"
      >
        <BookOpen className="h-3.5 w-3.5" />
        Policy Library ({COMPANY_POLICIES.length})
      </button>
    </div>
  );

  return (
    <>
      <AgentChatPanel
        agentName="HR Policy & Leave Assistant"
        agentDescription={
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-status-success)]" />
            Answers grounded in company policies and your real-time HR data
          </span> as unknown as string
        }
        agentIcon={<Sparkles className="h-4 w-4" />}
        welcomeMessage={WELCOME_MESSAGE}
        suggestedPrompts={SUGGESTED_PROMPTS}
        inputPlaceholder="Ask about leave balance, salary deductions, working hours…"
        thinkingText="Checking HR policies and your personnel records…"
        toolbar={toolbar}
        onSendMessage={handleSend}
        renderMetadataCard={(metadata) => {
          // Leave balance card
          if (
            metadata.type === "leave_balance" &&
            metadata.data &&
            typeof metadata.data === "object"
          ) {
            const d = metadata.data as Record<string, number>;
            return (
              <div className="mt-2 grid grid-cols-3 gap-2 rounded-[var(--radius-control)] bg-[var(--color-bg-surface)] p-2.5 border border-[var(--color-border-subtle)]">
                <div className="text-center">
                  <span className="text-[10px] text-[var(--color-text-secondary)]">Allowance</span>
                  <div className="font-bold text-sm text-[var(--color-text-primary)]">{d.allowance} days</div>
                </div>
                <div className="text-center">
                  <span className="text-[10px] text-[var(--color-text-secondary)]">Used</span>
                  <div className="font-bold text-sm text-[var(--color-text-secondary)]">{d.usedPaidDays} days</div>
                </div>
                <div className="text-center">
                  <span className="text-[10px] font-bold text-[var(--color-status-success)]">Remaining</span>
                  <div className="font-black text-sm text-[var(--color-status-success)]">{d.remainingDays} days</div>
                </div>
              </div>
            );
          }
          return null;
        }}
      />

      {/* Policy Library Modal */}
      {policyOpen && (
        <Portal>
          <div
            className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center overflow-hidden p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setPolicyOpen(false)}
          >
            <div
              className="relative w-full max-w-2xl max-h-[92dvh] sm:max-h-[85vh] overflow-y-auto rounded-t-[calc(var(--radius-card)+6px)] sm:rounded-[var(--radius-card)] border-t sm:border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4 sm:p-6 shadow-2xl pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 rounded-full bg-[var(--color-border-control)] mx-auto mb-3 sm:hidden shrink-0" />

              <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-[var(--color-text-secondary)]" />
                  <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                    Company Policy Library
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPolicyOpen(false)}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[var(--radius-control)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Policy pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-3 border-b border-[var(--color-border-subtle)] no-scrollbar">
                {COMPANY_POLICIES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPolicyId(p.id)}
                    className={`shrink-0 rounded-[var(--radius-control)] px-3 py-1.5 text-xs font-bold transition-colors ${
                      selectedPolicyId === p.id
                        ? "bg-[var(--color-action-primary)] text-[var(--color-action-on-primary)]"
                        : "border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]"
                    }`}
                  >
                    {p.title}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto pt-4 pr-1 text-xs space-y-3 text-[var(--color-text-primary)]">
                {selectedPolicy && (
                  <>
                    <div className="rounded-[var(--radius-control)] bg-[var(--color-bg-subtle)] p-3">
                      <span className="font-bold text-[11px] uppercase tracking-wider text-[var(--color-text-secondary)]">
                        Summary
                      </span>
                      <p className="mt-0.5">{selectedPolicy.summary}</p>
                    </div>
                    <div className="whitespace-pre-wrap leading-relaxed font-mono bg-[var(--color-bg-subtle)]/40 p-4 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)]">
                      {selectedPolicy.content}
                    </div>
                  </>
                )}
              </div>

              <div className="border-t border-[var(--color-border-subtle)] pt-3 text-right shrink-0">
                <button
                  type="button"
                  onClick={() => setPolicyOpen(false)}
                  className="min-h-[44px] rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] px-5 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
