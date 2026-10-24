"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  Loader2,
  Bot,
  User,
  ShieldCheck,
  BookOpen,
  Calendar,
  Clock,
  DollarSign,
  X,
  FileText,
} from "lucide-react";
import type { Employee, AIChatMessage, HRPolicyDocument } from "@/features/hr/types";
import { askHRAssistantAction } from "@/features/hr/actions/ai.action";
import { COMPANY_POLICIES } from "@/features/hr/policies/company-policies";
import { Portal } from "@/shared/components/ui/portal";

type AIHRAssistantProps = {
  currentEmployee?: Employee | null;
  employees: Employee[];
};

const SUGGESTED_PROMPTS = [
  "How many leave days do I have left?",
  "How is unpaid leave deducted from my salary?",
  "What is the procedure for sick leave?",
  "What are our official working hours and arrival rules?",
  "What is our policy for maternity & paternity leave?",
];

export function AIHRAssistant({ currentEmployee, employees }: AIHRAssistantProps) {
  const [isPending, startTransition] = useTransition();

  const [activeEmployeeId, setActiveEmployeeId] = useState<string>(
    currentEmployee?.id || (employees[0]?.id ?? "")
  );

  const activeEmployee = employees.find((e) => e.id === activeEmployeeId) || currentEmployee;

  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      id: "msg-welcome",
      role: "assistant",
      content: `Hello **${
        activeEmployee?.fullName || "there"
      }**! I am your **AnOps HR Policy & Leave Assistant**.\n\nI can answer questions regarding official company HR policies and query your real-time database records:\n- 🌴 **Leave Balances & Status**: Check your remaining annual leave days and pending requests.\n- 💰 **Payroll & Deductions**: Understand how unpaid leaves affect your net salary.\n- ⏱️ **Working Hours & Punch**: Guidance on standard 40-hour weeks and flexible arrival.\n- 📋 **Absence Policies**: Sick leave medical certificates, maternity, paternity, and bereavement rules.\n\nHow can I help you today?`,
      timestamp: new Date().toISOString(),
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState("");
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<HRPolicyDocument | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputPrompt).trim();
    if (!text || isPending) return;

    const userMessage: AIChatMessage = {
      id: "user-" + Date.now(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputPrompt("");

    startTransition(async () => {
      const res = await askHRAssistantAction({
        prompt: text,
        employeeId: activeEmployeeId,
      });

      if (res.data) {
        setMessages((prev) => [...prev, res.data!]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: "err-" + Date.now(),
            role: "assistant",
            content:
              res.error ||
              "I encountered an unexpected issue while retrieving that information. Please try again or contact HR.",
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleOpenPolicy = (policy: HRPolicyDocument) => {
    setSelectedPolicy(policy);
    setPolicyModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner with Employee Context & Policy Drawer Button */}
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-action-primary)] text-[var(--color-action-on-primary)] shadow-xs">
                <Sparkles className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
                HR Policy & Leave FAQ Assistant
              </h2>
              <span className="rounded-full bg-[var(--color-action-primary)]/20 px-2 py-0.5 text-[10px] font-bold text-[var(--color-text-primary)]">
                AI Agent
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-status-success)]" />
              <span>
                Answers are grounded strictly in AnOps company policy documents and scoped to your user account.
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Active Staff Switcher for testing */}
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] font-bold text-[var(--color-text-secondary)]">
                Context:
              </label>
              <select
                value={activeEmployeeId}
                onChange={(e) => setActiveEmployeeId(e.target.value)}
                disabled={isPending}
                className="min-h-[36px] rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] px-2.5 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-action-primary)]"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName}
                  </option>
                ))}
              </select>
            </div>

            {/* View Policies Button */}
            <button
              type="button"
              onClick={() => {
                setSelectedPolicy(COMPANY_POLICIES[0]);
                setPolicyModalOpen(true);
              }}
              className="flex min-h-[36px] items-center gap-1.5 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-3 text-xs font-bold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] transition-colors shadow-xs"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Policy Library ({COMPANY_POLICIES.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Thread Box */}
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] shadow-xs flex flex-col h-[420px] sm:h-[560px]">
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {messages.map((msg) => {
            const isUser = msg.role === "user";

            return (
              <div
                key={msg.id}
                className={`flex gap-3 text-xs ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-action-primary)] text-[var(--color-action-on-primary)] shadow-xs">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`max-w-2xl rounded-2xl px-4 py-3 shadow-xs ${
                    isUser
                      ? "bg-[var(--color-action-primary)] text-[var(--color-action-on-primary)] font-medium rounded-tr-xs"
                      : "bg-[var(--color-bg-subtle)] text-[var(--color-text-primary)] border border-[var(--color-border-subtle)] rounded-tl-xs"
                  }`}
                >
                  <div className="prose prose-xs dark:prose-invert max-w-none whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </div>

                  {/* Tool Data Display */}
                  {msg.toolData && msg.toolData.type === "leave_balance" && (
                    <div className="mt-3 grid grid-cols-3 gap-2 rounded-[var(--radius-control)] bg-[var(--color-bg-surface)] p-2.5 border border-[var(--color-border-subtle)]">
                      <div className="text-center">
                        <span className="text-[10px] text-[var(--color-text-secondary)]">Allowance</span>
                        <div className="font-bold text-sm text-[var(--color-text-primary)]">
                          {String(msg.toolData.data.allowance)} days
                        </div>
                      </div>
                      <div className="text-center">
                        <span className="text-[10px] text-[var(--color-text-secondary)]">Used</span>
                        <div className="font-bold text-sm text-[var(--color-text-secondary)]">
                          {String(msg.toolData.data.usedPaidDays)} days
                        </div>
                      </div>
                      <div className="text-center">
                        <span className="text-[10px] font-bold text-[var(--color-status-success)]">Remaining</span>
                        <div className="font-black text-sm text-[var(--color-status-success)]">
                          {String(msg.toolData.data.remainingDays)} days
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-1 text-[9px] opacity-60 text-right">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>

                {isUser && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-text-primary)] text-[var(--color-bg-surface)] shadow-xs">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })}

          {isPending && (
            <div className="flex items-center gap-3 text-xs">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-action-primary)] text-[var(--color-action-on-primary)] animate-pulse">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-2xl rounded-tl-xs bg-[var(--color-bg-subtle)] px-4 py-3 border border-[var(--color-border-subtle)] flex items-center gap-2 text-[var(--color-text-secondary)]">
                <Loader2 className="h-4 w-4 animate-spin text-[var(--color-action-on-primary)]" />
                <span>Checking HR policies and personnel database records...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Chips */}
        <div className="border-t border-[var(--color-border-subtle)] px-4 py-2 bg-[var(--color-bg-subtle)]/40 overflow-x-auto flex items-center gap-2 no-scrollbar">
          <span className="text-[10px] font-bold text-[var(--color-text-secondary)] shrink-0">
            Suggested:
          </span>
          {SUGGESTED_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(prompt)}
              disabled={isPending}
              className="shrink-0 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-primary)] hover:border-[var(--color-action-primary)] hover:bg-[var(--color-action-primary)]/10 transition-colors disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="border-t border-[var(--color-border-subtle)] p-3 sm:p-4 bg-[var(--color-bg-surface)]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <textarea
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about leave balance, unpaid salary deductions, or working hours..."
              rows={1}
              disabled={isPending}
              className="flex-1 resize-none rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] px-3 py-2.5 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-action-primary)] min-h-[42px] max-h-24"
            />
            <button
              type="submit"
              disabled={isPending || !inputPrompt.trim()}
              className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-[var(--color-action-primary)] text-[var(--color-action-on-primary)] hover:bg-[var(--color-action-hover)] transition-colors disabled:opacity-50 shadow-xs"
              title="Send question"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Policy Knowledge Base Modal */}
      {policyModalOpen && selectedPolicy && (
        <Portal>
          <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center overflow-hidden p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div
              className="relative w-full max-w-2xl max-h-[92dvh] sm:max-h-[85vh] overflow-y-auto rounded-t-[calc(var(--radius-card)+6px)] sm:rounded-[var(--radius-card)] border-t sm:border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4 sm:p-6 shadow-2xl pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Mobile drag handle */}
              <div className="w-10 h-1 rounded-full bg-[var(--color-border-control)] mx-auto mb-3 sm:hidden shrink-0" />

              <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-[var(--color-text-secondary)]" />
                  <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                    AnOps Company Policy Documents
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPolicyModalOpen(false)}
                  aria-label="Close dialog"
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[var(--radius-control)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] transition-colors shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Policy Selector Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-3 border-b border-[var(--color-border-subtle)]">
                {COMPANY_POLICIES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPolicy(p)}
                    className={`shrink-0 rounded-[var(--radius-control)] px-3 py-1.5 text-xs font-bold transition-colors ${
                      selectedPolicy.id === p.id
                        ? "bg-[var(--color-action-primary)] text-[var(--color-action-on-primary)]"
                        : "border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]"
                    }`}
                  >
                    {p.title}
                  </button>
                ))}
              </div>

              {/* Policy Content Viewer */}
              <div className="flex-1 overflow-y-auto pt-4 text-xs space-y-3 pr-1 text-[var(--color-text-primary)]">
                <div className="rounded-[var(--radius-control)] bg-[var(--color-bg-subtle)] p-3">
                  <span className="font-bold text-[11px] uppercase tracking-wider text-[var(--color-text-secondary)]">
                    Summary
                  </span>
                  <p className="mt-0.5 text-xs text-[var(--color-text-primary)]">
                    {selectedPolicy.summary}
                  </p>
                </div>
                <div className="whitespace-pre-wrap leading-relaxed font-mono bg-[var(--color-bg-subtle)]/40 p-4 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] text-xs">
                  {selectedPolicy.content}
                </div>
              </div>

              <div className="border-t border-[var(--color-border-subtle)] pt-3 text-right shrink-0">
                <button
                  type="button"
                  onClick={() => setPolicyModalOpen(false)}
                  className="min-h-[44px] rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] px-5 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
