"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Mail, MessageSquareText, Plus, Search, X } from "lucide-react";
import { campaignInputSchema } from "@/features/marketing/schemas/marketing.schema";
import { validateMarketingInput } from "@/features/marketing/lib/client-validation";

type Campaign = {
  id: string;
  name: string;
  channel: "email" | "sms";
  subject?: string;
  body: string;
  audienceId: string;
  status: string;
  snapshot?: { recipientCount: number };
};

type Audience = { id: string; name: string; eligibleCount: number };
type Template = { id: string; name: string; channel: "email" | "sms"; subject?: string; body: string };

const field =
  "h-11 w-full rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-transparent px-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-control)]";

export function CampaignsWorkspace({ initialCampaigns }: { initialCampaigns: Campaign[] }) {
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Modal form states
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const filtered = useMemo(
    () =>
      campaigns.filter(
        (item) =>
          item.name.toLowerCase().includes(query.toLowerCase()) &&
          (status === "all" || item.status === status)
      ),
    [campaigns, query, status]
  );

  async function showCreate() {
    setError("");
    setSubject("");
    setBody("");
    setChannel("email");
    const [audienceResponse, templateResponse] = await Promise.all([
      fetch("/api/marketing/audiences"),
      fetch("/api/marketing/templates"),
    ]);
    if (audienceResponse.ok) setAudiences((await audienceResponse.json()) as Audience[]);
    if (templateResponse.ok) setTemplates((await templateResponse.json()) as Template[]);
    setOpen(true);
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const validation = validateMarketingInput(campaignInputSchema, {
      name: form.get("name"), channel, subject: channel === "email" ? subject : "", body,
      audienceId: form.get("audienceId"),
    });
    if ("error" in validation) { setError(validation.error); return; }
    const response = await fetch("/api/marketing/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validation.data),
    });
    const data = (await response.json()) as Campaign & { error?: string };
    if (!response.ok) {
      setError(data.error ?? "Unable to create campaign.");
      return;
    }
    setCampaigns((items) => [data, ...items]);
    setOpen(false);
    setMessage("Campaign saved as draft.");
  }

  async function command(id: string, commandName: string) {
    const response = await fetch(`/api/marketing/campaigns/${id}/commands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: commandName }),
    });
    const data = (await response.json()) as { status?: string; error?: string };
    if (!response.ok) {
      setMessage(data.error ?? "Unable to update campaign.");
      return;
    }
    setCampaigns((items) =>
      items.map((item) => (item.id === id ? { ...item, status: data.status ?? item.status } : item))
    );
    setMessage("Campaign updated.");
  }

  const compatible = templates.filter((template) => template.channel === channel);

  return (
    <div className="space-y-6 reveal">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
            Marketing & Socials
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
            Campaigns
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Draft and review campaigns. External delivery is unavailable until a provider is configured.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void showCreate()}
          className="flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--color-action-primary)] px-4 text-sm font-bold text-[var(--color-action-on-primary)] hover:bg-[var(--color-action-hover)]"
        >
          <Plus className="h-4 w-4" /> New campaign
        </button>
      </header>

      {message && (
        <p role="status" className="rounded-[var(--radius-control)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)]">
          {message}
        </p>
      )}

      <section className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
        <div className="flex flex-col gap-3 border-b border-[var(--color-border-subtle)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-secondary)]" />
            <input
              aria-label="Search campaigns"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search campaigns"
              className={`${field} pl-9`}
            />
          </div>
          <select
            aria-label="Filter campaign status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className={`${field} sm:w-44`}
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="pending_approval">Pending approval</option>
            <option value="approved">Approved</option>
            <option value="scheduled">Scheduled</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)]/45 text-xs text-[var(--color-text-secondary)]">
              <tr>
                <th className="px-5 py-3 font-medium">Campaign</th>
                <th className="px-3 py-3 font-medium">Channel</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Snapshot</th>
                <th className="px-3 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-subtle)]">
              {filtered.map((campaign) => (
                <tr key={campaign.id} className="hover:bg-[var(--color-bg-subtle)]/30">
                  <td className="px-5 py-4">
                    <Link
                      href={`/marketing/campaigns/${campaign.id}`}
                      className="font-semibold text-[var(--color-text-primary)] hover:underline"
                    >
                      {campaign.name}
                    </Link>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {campaign.subject || campaign.body.slice(0, 60)}
                    </p>
                  </td>
                  <td className="px-3 py-4">
                    {campaign.channel === "email" ? (
                      <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
                        <Mail className="h-4 w-4" /> Email
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
                        <MessageSquareText className="h-4 w-4" /> SMS
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-4">
                    <span className="rounded-full bg-[var(--color-bg-subtle)] px-2.5 py-1 text-xs font-semibold capitalize text-[var(--color-text-primary)]">
                      {campaign.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-3 py-4 text-xs text-[var(--color-text-secondary)]">
                    {campaign.snapshot ? `${campaign.snapshot.recipientCount} recipients` : "Not approved"}
                  </td>
                  <td className="px-3 py-4">
                    {campaign.status === "draft" && (
                      <button
                        type="button"
                        onClick={() => void command(campaign.id, "submit")}
                        className="min-h-9 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)] px-3 text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-border-subtle)]"
                      >
                        Submit
                      </button>
                    )}
                    {campaign.status === "pending_approval" && (
                      <button
                        type="button"
                        onClick={() => void command(campaign.id, "approve")}
                        className="min-h-9 rounded-[var(--radius-control)] bg-[var(--color-action-primary)] px-3 text-xs font-bold text-[var(--color-action-on-primary)] hover:bg-[var(--color-action-hover)]"
                      >
                        Approve
                      </button>
                    )}
                    {["approved", "scheduled"].includes(campaign.status) && (
                      <button
                        type="button"
                        onClick={() => void command(campaign.id, "cancel")}
                        className="min-h-9 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] px-3 text-xs font-semibold text-[var(--color-status-error)] hover:bg-[var(--color-status-error)]/10"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <p className="p-10 text-center text-sm text-[var(--color-text-secondary)]">
            No campaigns match these filters.
          </p>
        )}
      </section>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <form
            onSubmit={create}
            noValidate
            className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5 shadow-2xl sm:rounded-[var(--radius-card)]"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-[var(--color-text-primary)]">New campaign</h2>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  Applying a template copies content into this draft.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close form"
                className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mt-5 block text-sm font-semibold text-[var(--color-text-primary)]">
              Campaign name
              <input name="name" placeholder="e.g. Autumn Harvest Announcement" className={`${field} mt-1.5`} />
            </label>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-[var(--color-text-primary)]">
                Channel
                <select
                  name="channel"
                  value={channel}
                  onChange={(event) => {
                    const next = event.target.value as "email" | "sms";
                    setChannel(next);
                    setSubject("");
                    setBody("");
                  }}
                  className={`${field} mt-1.5`}
                >
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                </select>
              </label>

              <label className="text-sm font-semibold text-[var(--color-text-primary)]">
                Template
                <select
                  aria-label="Apply template"
                  onChange={(event) => {
                    const tmpl = compatible.find((item) => item.id === event.target.value);
                    if (tmpl) {
                      setSubject(tmpl.subject ?? "");
                      setBody(tmpl.body);
                    }
                  }}
                  className={`${field} mt-1.5`}
                >
                  <option value="">No template</option>
                  {compatible.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-semibold text-[var(--color-text-primary)] sm:col-span-2">
                Subject
                {channel === "email" ? (
                  <input
                    name="subject"
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    placeholder="Subject line for email recipients"
                    className={`${field} mt-1.5`}
                  />
                ) : (
                  <input
                    name="subject"
                    value=""
                    readOnly
                    className={`${field} mt-1.5 opacity-50`}
                    aria-label="Subject not used for SMS"
                    placeholder="Not applicable for SMS"
                  />
                )}
              </label>

              <label className="text-sm font-semibold text-[var(--color-text-primary)] sm:col-span-2">
                Message
                <textarea
                  name="body"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="Enter message body or template placeholders e.g. {{firstName}}"
                  rows={6}
                  className="mt-1.5 w-full rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-transparent p-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-control)]"
                />
              </label>

              <label className="text-sm font-semibold text-[var(--color-text-primary)] sm:col-span-2">
                Audience
                <select name="audienceId" className={`${field} mt-1.5`}>
                  <option value="">Select target audience</option>
                  {audiences.map((audience) => (
                    <option key={audience.id} value={audience.id}>
                      {audience.name} ({audience.eligibleCount} eligible)
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {error && (
              <p role="alert" className="mt-4 text-sm text-[var(--color-status-error)]">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="mt-5 min-h-11 w-full rounded-[var(--radius-control)] bg-[var(--color-action-primary)] text-sm font-bold text-[var(--color-action-on-primary)] hover:bg-[var(--color-action-hover)]"
            >
              Save draft
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
