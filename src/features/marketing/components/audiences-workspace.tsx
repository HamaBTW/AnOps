"use client";

import { useState } from "react";
import { Plus, Users, X } from "lucide-react";
import { audienceInputSchema } from "@/features/marketing/schemas/marketing.schema";
import { validateMarketingInput } from "@/features/marketing/lib/client-validation";

type Audience = {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  memberCount: number;
  eligibleCount: number;
};

const inputClass =
  "h-11 w-full rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-transparent px-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-control)]";

export function AudiencesWorkspace({ initialAudiences }: { initialAudiences: Audience[] }) {
  const [audiences, setAudiences] = useState(initialAudiences);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const validation = validateMarketingInput(audienceInputSchema, { name: form.get("name"), description: form.get("description") });
    if ("error" in validation) { setError(validation.error); setIsSubmitting(false); return; }
    const response = await fetch("/api/marketing/audiences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validation.data),
    });
    if (!response.ok) {
      setError("Unable to create audience. Please verify your inputs.");
      setIsSubmitting(false);
      return;
    }
    const audience = (await response.json()) as Audience;
    setAudiences((current) => [audience, ...current]);
    setIsSubmitting(false);
    setOpen(false);
  }

  return (
    <div className="space-y-6 reveal">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
            Marketing & Socials
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
            Audiences
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Consent-verified target lists with dynamic channel eligibility counts.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setError("");
            setOpen(true);
          }}
          className="flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--color-action-primary)] px-4 text-sm font-bold text-[var(--color-action-on-primary)] hover:bg-[var(--color-action-hover)]"
        >
          <Plus className="h-4 w-4" /> New audience
        </button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {audiences.map((audience) => (
          <article
            key={audience.id}
            className="flex flex-col justify-between rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5 shadow-sm"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)] bg-[var(--color-bg-subtle)] text-[var(--color-text-primary)]">
                  <Users className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-[var(--color-status-success-bg)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-status-success)]">
                  {audience.isActive ? "Active" : "Archived"}
                </span>
              </div>
              <h2 className="mt-3 text-lg font-bold text-[var(--color-text-primary)]">{audience.name}</h2>
              <p className="mt-1 min-h-10 text-sm text-[var(--color-text-secondary)] line-clamp-2">
                {audience.description || "No description provided."}
              </p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[var(--color-border-subtle)] pt-4">
              <div>
                <p className="text-2xl font-bold text-[var(--color-text-primary)]">{audience.memberCount}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">Total Members</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--color-action-primary)]">{audience.eligibleCount}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">Email Eligible</p>
              </div>
            </div>
          </article>
        ))}

        {audiences.length === 0 && (
          <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-border-control)] p-10 text-center text-sm text-[var(--color-text-secondary)] sm:col-span-2 lg:col-span-3">
            No audiences defined yet. Create a target audience list before dispatching campaigns.
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <form
            onSubmit={create}
            noValidate
            className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5 shadow-2xl sm:rounded-[var(--radius-card)]"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Create Audience</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mt-5 block text-sm font-semibold text-[var(--color-text-primary)]">
              Audience Name
              <input
                name="name"
                placeholder="e.g. VIP B2B Clients"
                className={`${inputClass} mt-1.5`}
              />
            </label>

            <label className="mt-4 block text-sm font-semibold text-[var(--color-text-primary)]">
              Description
              <textarea
                name="description"
                rows={3}
                placeholder="Describe the segment criteria"
                className="mt-1.5 w-full rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-transparent p-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-control)]"
              />
            </label>

            {error && (
              <p role="alert" className="mt-3 text-sm text-[var(--color-status-error)]">
                {error}
              </p>
            )}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-11 flex-1 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="min-h-11 flex-1 rounded-[var(--radius-control)] bg-[var(--color-action-primary)] text-sm font-bold text-[var(--color-action-on-primary)] hover:bg-[var(--color-action-hover)] disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
