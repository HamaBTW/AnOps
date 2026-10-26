"use client";

import { FormEvent, useMemo, useState } from "react";
import { Copy, FileText, Plus, Search, Trash2, X } from "lucide-react";
import { templateInputSchema } from "@/features/marketing/schemas/marketing.schema";
import { validateMarketingInput } from "@/features/marketing/lib/client-validation";
import { MarketingDialog } from "@/features/marketing/components/marketing-dialog";

type Template = {
  id: string;
  name: string;
  description: string;
  channel: "email" | "sms";
  subject?: string;
  body: string;
  archived: boolean;
};

const field =
  "h-11 w-full rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-transparent px-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-control)]";

export function TemplatesWorkspace({ initialTemplates }: { initialTemplates: Template[] }) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [query, setQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [archiveTarget, setArchiveTarget] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      templates.filter((item) => {
        const matchesQuery =
          item.name.toLowerCase().includes(query.toLowerCase()) ||
          item.description?.toLowerCase().includes(query.toLowerCase());
        const matchesChannel = channelFilter === "all" || item.channel === channelFilter;
        return matchesQuery && matchesChannel;
      }),
    [templates, query, channelFilter]
  );

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const validation = validateMarketingInput(templateInputSchema, {
      name: form.get("name"), description: form.get("description"), channel: form.get("channel"),
      subject: form.get("subject"), body: form.get("body"),
    });
    if ("error" in validation) { setError(validation.error); return; }
    const response = await fetch("/api/marketing/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validation.data),
    });
    const data = (await response.json()) as Template & { error?: string };
    if (!response.ok) {
      setError(data.error ?? "Unable to save template.");
      return;
    }
    setTemplates((items) => [data, ...items]);
    setOpen(false);
  }

  async function duplicate(id: string) {
    const response = await fetch(`/api/marketing/templates/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "duplicate" }),
    });
    if (response.ok) {
      const copy = (await response.json()) as Template;
      setTemplates((items) => [copy, ...items]);
    }
  }

  async function archive(id: string) {
    const response = await fetch(`/api/marketing/templates/${id}`, { method: "DELETE" });
    if (response.ok) setTemplates((items) => items.filter((item) => item.id !== id));
    setArchiveTarget(null);
  }

  return (
    <div className="space-y-6 reveal">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
            Marketing & Socials
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
            Templates
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Reusable email and SMS content. Campaigns copy content immutably at draft creation.
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
          <Plus className="h-4 w-4" /> New template
        </button>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-secondary)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search templates"
            placeholder="Search templates"
            className={`${field} pl-9`}
          />
        </div>
        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          className={`${field} sm:w-44`}
          aria-label="Filter by channel"
        >
          <option value="all">All channels</option>
          <option value="email">Email only</option>
          <option value="sms">SMS only</option>
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((template) => (
          <article
            key={template.id}
            className="flex flex-col justify-between rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5 shadow-sm"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)] bg-[var(--color-bg-subtle)] text-[var(--color-text-primary)]">
                  <FileText className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-[var(--color-bg-subtle)] px-2.5 py-0.5 text-xs font-semibold uppercase text-[var(--color-text-secondary)]">
                  {template.channel}
                </span>
              </div>
              <h2 className="mt-3 text-lg font-bold text-[var(--color-text-primary)]">{template.name}</h2>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)] line-clamp-2">
                {template.description || "No description"}
              </p>
              <div className="mt-3 rounded-[var(--radius-control)] bg-[var(--color-bg-subtle)] p-3 text-sm">
                <p className="font-semibold text-xs text-[var(--color-text-primary)]">
                  {template.subject || "SMS text body"}
                </p>
                <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  {template.body}
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-2 border-t border-[var(--color-border-subtle)] pt-3">
              <button
                type="button"
                onClick={() => void duplicate(template.id)}
                className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]"
              >
                <Copy className="h-3.5 w-3.5" /> Duplicate
              </button>
              <button
                type="button"
                onClick={() => setArchiveTarget(template.id)}
                className="flex min-h-10 items-center justify-center rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] px-3 text-xs font-semibold text-[var(--color-status-error)] hover:bg-[var(--color-status-error)]/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </article>
        ))}
        {filtered.length === 0 && (
          <p className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-border-control)] p-10 text-center text-sm text-[var(--color-text-secondary)] sm:col-span-2 lg:col-span-3">
            No templates match the criteria.
          </p>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <form
            onSubmit={create}
            noValidate
            className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5 shadow-2xl sm:rounded-[var(--radius-card)]"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-[var(--color-text-primary)]">New template</h2>
                <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">Create a reusable layout for campaigns.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close form"
                className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mt-4 block text-sm font-semibold text-[var(--color-text-primary)]">
              Name
              <input name="name" placeholder="e.g. Monthly Newsletter" className={`${field} mt-1.5`} />
            </label>

            <label className="mt-4 block text-sm font-semibold text-[var(--color-text-primary)]">
              Description
              <input name="description" placeholder="Brief note about usage" className={`${field} mt-1.5`} />
            </label>

            <label className="mt-4 block text-sm font-semibold text-[var(--color-text-primary)]">
              Channel
              <select name="channel" className={`${field} mt-1.5`}>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
            </label>

            <label className="mt-4 block text-sm font-semibold text-[var(--color-text-primary)]">
              Subject (for email)
              <input name="subject" placeholder="Subject line" className={`${field} mt-1.5`} />
            </label>

            <label className="mt-4 block text-sm font-semibold text-[var(--color-text-primary)]">
              Message Body
              <textarea
                name="body"
                rows={7}
                placeholder="Use tags like {{firstName}}, {{companyName}} for personalization."
                className="mt-1.5 w-full rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-transparent p-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-control)]"
              />
            </label>

            {error && (
              <p role="alert" className="mt-3 text-sm text-[var(--color-status-error)]">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="mt-5 min-h-11 w-full rounded-[var(--radius-control)] bg-[var(--color-action-primary)] text-sm font-bold text-[var(--color-action-on-primary)] hover:bg-[var(--color-action-hover)]"
            >
              Save template
            </button>
          </form>
        </div>
      )}
      <MarketingDialog open={Boolean(archiveTarget)} title="Archive template?" description="Archived templates stay out of new campaign drafts. You can keep the existing campaign history intact." confirmLabel="Archive template" onCancel={() => setArchiveTarget(null)} onConfirm={() => archiveTarget && void archive(archiveTarget)} />
    </div>
  );
}
