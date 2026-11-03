"use client";
import { ModalPortal } from "@/shared/components/ui/modal-portal";

import { useState, useTransition } from "react";
import { Button } from "@/shared/components/ui/button";
import { generateRentalAgreementDocAction } from "@/features/hr/actions/worker-rental.actions";
import type { WorkerRentalAgreement } from "@/features/hr/types/worker-rental.types";

export function RentalAgreementDocModal({
  agreement,
}: {
  agreement: WorkerRentalAgreement;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [language, setLanguage] = useState<"fr" | "en">("fr");
  const [loading, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [docContent, setDocContent] = useState<string | null>(null);
  const [docTitle, setDocTitle] = useState<string>("");
  const [copied, setCopied] = useState(false);

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const res = await generateRentalAgreementDocAction(agreement.id, language);
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.data) {
        setDocContent(res.data.agreementHtml);
        setDocTitle(res.data.title);
      }
    });
  }

  function handleCopy() {
    if (!docContent) return;
    navigator.clipboard.writeText(docContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          if (!docContent) handleGenerate();
        }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-control)] border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 shadow-sm transition-all"
      >
        <span>📄</span> AI Agreement Contract
      </button>

      {isOpen && (
        <ModalPortal><div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[var(--radius-card)] bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] p-6 shadow-2xl space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[var(--color-border-subtle)] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">📄</span>
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                    Legal Secondment Agreement Generator
                  </h3>
                </div>
                <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                  Convention de mise à disposition de personnel · Agreement: {agreement.agreementNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-lg p-1"
              >
                ✕
              </button>
            </div>

            {/* Language Switch & Generator Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-[var(--radius-control)] bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)]">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium text-[var(--color-text-secondary)]">Document Language:</span>
                <button
                  type="button"
                  onClick={() => {
                    setLanguage("fr");
                    setDocContent(null);
                  }}
                  className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                    language === "fr"
                      ? "bg-[var(--color-action-primary)] text-white"
                      : "bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]"
                  }`}
                >
                  🇫🇷 Français (Convention)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLanguage("en");
                    setDocContent(null);
                  }}
                  className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                    language === "en"
                      ? "bg-[var(--color-action-primary)] text-white"
                      : "bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]"
                  }`}
                >
                  🇬🇧 English (Agreement)
                </button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  onClick={handleGenerate}
                  disabled={loading}
                  className="text-xs"
                >
                  {loading ? "AI Drafting Agreement..." : "✨ Regenerate Contract"}
                </Button>
              </div>
            </div>

            {error && (
              <div className="p-3 text-xs rounded-[var(--radius-control)] bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
                {error}
              </div>
            )}

            {/* Document Content View */}
            {loading && (
              <div className="py-16 text-center space-y-3">
                <div className="animate-spin text-3xl">⏳</div>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Drafting customized corporate secondment agreement with labor law clauses...
                </p>
              </div>
            )}

            {docContent && !loading && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                    {docTitle}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="px-2.5 py-1 text-xs rounded border border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]"
                    >
                      {copied ? "✓ Copied!" : "📋 Copy Text"}
                    </button>
                    <button
                      type="button"
                      onClick={handlePrint}
                      className="px-2.5 py-1 text-xs rounded border border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]"
                    >
                      🖨️ Print / Save PDF
                    </button>
                  </div>
                </div>

                <div className="p-6 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)]/40 font-serif text-sm leading-relaxed text-[var(--color-text-primary)] whitespace-pre-wrap max-h-[55vh] overflow-y-auto">
                  {docContent}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end pt-3 border-t border-[var(--color-border-subtle)]">
              <Button variant="secondary" onClick={() => setIsOpen(false)} className="text-xs">
                Close
              </Button>
            </div>
          </div>
        </div>
      </ModalPortal>
      )}
    </>
  
  );
}

