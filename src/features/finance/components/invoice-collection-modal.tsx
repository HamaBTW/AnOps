"use client";

import { useState, useTransition } from "react";
import {
  generateInvoiceCollectionNoticeAction,
  type CollectionTone,
  type NoticeLanguage,
} from "@/features/finance/actions/finance-ai.actions";
import { Button, selectClass, textareaClass } from "@/shared/components/ui/button";
import { FormMessage } from "@/shared/components/ui/form-message";

export function InvoiceCollectionModal({
  isOpen,
  onClose,
  invoiceId,
  invoiceNumber,
  customerEmail,
  balance,
}: {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  invoiceNumber: string;
  customerEmail?: string;
  balance: number;
}) {
  const [pending, startTransition] = useTransition();
  const [tone, setTone] = useState<CollectionTone>("gentle");
  const [language, setLanguage] = useState<NoticeLanguage>("fr");
  const [subject, setSubject] = useState("");
  const [letter, setLetter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const res = await generateInvoiceCollectionNoticeAction({
        invoiceId,
        tone,
        language,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.data) {
        setSubject(res.data.subject);
        setLetter(res.data.letter);
      }
    });
  }

  function handleCopy() {
    const fullText = `Subject: ${subject}\n\n${letter}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const mailtoLink = customerEmail
    ? `mailto:${encodeURIComponent(customerEmail)}?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(letter)}`
    : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs print:hidden animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">✨</span>
              <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                AI Debt Collection & Reminder Notice
              </h3>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              Generate legally sound reminder letters and dunning notices for invoice{" "}
              <span className="font-mono font-semibold text-[var(--color-text-primary)]">
                {invoiceNumber}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-xl p-1"
          >
            ✕
          </button>
        </div>

        {/* Configuration Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-[var(--color-bg-subtle)]/40 border border-[var(--color-border-subtle)]">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
              Reminder Level / Tone
            </label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as CollectionTone)}
              className={selectClass}
            >
              <option value="gentle">🟢 Friendly Reminder (1st Notice)</option>
              <option value="firm">🟡 Firm & Formal Follow-up (2nd Notice)</option>
              <option value="final">🔴 Final Demand / Mise en demeure (3rd Notice)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
              Output Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as NoticeLanguage)}
              className={selectClass}
            >
              <option value="fr">Français (French)</option>
              <option value="en">English (Anglais)</option>
            </select>
          </div>

          <div className="sm:col-span-2 flex items-center justify-between pt-1">
            <span className="text-xs text-[var(--color-text-secondary)]">
              Outstanding Balance:{" "}
              <span className="font-bold text-[var(--color-status-error)]">
                {balance.toLocaleString(undefined, { minimumFractionDigits: 3 })}
              </span>
            </span>
            <Button
              variant="primary"
              onClick={handleGenerate}
              disabled={pending}
              className="text-xs"
            >
              {pending ? "AI Generating..." : letter ? "Regenerate Notice" : "Generate Notice with AI"}
            </Button>
          </div>
        </div>

        {error && <FormMessage kind="error">{error}</FormMessage>}

        {/* Generated Content Output */}
        {letter && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--color-text-secondary)]">
                Email Subject Line
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] focus:outline-none focus:ring-[3px] focus:ring-[var(--color-focus-ring)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--color-text-secondary)]">
                Letter Body (Editable)
              </label>
              <textarea
                rows={9}
                value={letter}
                onChange={(e) => setLetter(e.target.value)}
                className={textareaClass}
              />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--color-border-subtle)]">
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={handleCopy} className="text-xs">
                  {copied ? "✓ Copied to Clipboard!" : "📋 Copy Subject & Body"}
                </Button>
                {mailtoLink && (
                  <a
                    href={mailtoLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-[var(--radius-control)] bg-[var(--color-action-primary)] text-black hover:opacity-90"
                  >
                    ✉️ Open in Email Client
                  </a>
                )}
              </div>
              <Button variant="secondary" onClick={onClose} className="text-xs">
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

