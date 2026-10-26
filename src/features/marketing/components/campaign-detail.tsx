"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, ChevronDown, Copy, Edit3, RefreshCw, XCircle } from "lucide-react";
import { campaignInputSchema } from "@/features/marketing/schemas/marketing.schema";
import { validateMarketingInput } from "@/features/marketing/lib/client-validation";
import { MarketingDialog } from "@/features/marketing/components/marketing-dialog";

type Campaign = {
  id: string;
  name: string;
  channel: "email" | "sms";
  subject?: string;
  body: string;
  audienceId: string;
  status: string;
  snapshot?: { body: string; recipientCount: number };
  createdAt: string;
  updatedAt: string;
};

type Template = { id: string; name: string; channel: "email" | "sms"; subject?: string; body: string };
type Delivery = { _id: string; status: string; attemptCount: number; safeError?: string; nextAttemptAt?: string; channel: string };
type DeliveryData = {
  summary: { byStatus: Record<string, number>; providerConfigured: boolean };
  deliveries: { items: Delivery[]; total: number; page: number; pageSize: number };
};

const field =
  "h-11 w-full rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-transparent px-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-control)]";

export function CampaignDetail({ initialCampaign }: { initialCampaign: Campaign }) {
  const [campaign, setCampaign] = useState(initialCampaign);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState(initialCampaign.subject ?? "");
  const [body, setBody] = useState(initialCampaign.body);
  const [name, setName] = useState(initialCampaign.name);
  const [delivery, setDelivery] = useState<DeliveryData | null>(null);
  const [deliveryError, setDeliveryError] = useState("");
  const [deliveryBusy, setDeliveryBusy] = useState("");
  const [deliveryConfirmation, setDeliveryConfirmation] = useState<{ id: string; action: "retry" | "cancel" } | null>(null);

  async function loadDelivery() {
    const response = await fetch(`/api/marketing/campaigns/${campaign.id}/deliveries`, { cache: "no-store" });
    if (!response.ok) {
      setDeliveryError("Unable to load delivery records.");
      return;
    }
    setDelivery((await response.json()) as DeliveryData);
  }

  useEffect(() => {
    void loadDelivery();
  }, [campaign.id]);

  useEffect(() => {
    if (editing) {
      void fetch("/api/marketing/templates").then(async (response) => {
        if (response.ok) setTemplates((await response.json()) as Template[]);
      });
    }
  }, [editing]);

  function applyTemplate(id: string) {
    const template = templates.find((item) => item.id === id && item.channel === campaign.channel);
    if (!template) return;
    setSubject(campaign.channel === "email" ? template.subject ?? "" : "");
    setBody(template.body);
    setMessage("Template copied into this draft. Click Save to persist changes.");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateMarketingInput(campaignInputSchema, {
      name, channel: campaign.channel, subject: campaign.channel === "email" ? subject : "", body, audienceId: campaign.audienceId,
    });
    if ("error" in validation) { setMessage(validation.error); return; }
    const response = await fetch(`/api/marketing/campaigns/${campaign.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validation.data),
    });
    const data = (await response.json()) as Campaign & { error?: string };
    if (!response.ok) {
      setMessage(data.error ?? "Unable to save changes.");
      return;
    }
    setCampaign(data);
    setEditing(false);
    setMessage("Draft updated successfully.");
  }

  async function duplicate() {
    const response = await fetch(`/api/marketing/campaigns/${campaign.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "duplicate" }),
    });
    setMessage(response.ok ? "Campaign duplicated as a new draft." : "Unable to duplicate campaign.");
  }

  async function deliveryAction(id: string, action: "retry" | "cancel") {
    setDeliveryBusy(id);
    const response = await fetch(`/api/marketing/campaigns/${campaign.id}/deliveries`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deliveryId: id, action }),
    });
    setDeliveryBusy("");
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setDeliveryError(data.error ?? "Unable to update delivery.");
      return;
    }
    await loadDelivery();
    setDeliveryConfirmation(null);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 reveal">
      <div>
        <Link
          href="/marketing/campaigns"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to campaigns
        </Link>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] sm:text-3xl">{campaign.name}</h1>
            <p className="mt-1 text-sm capitalize text-[var(--color-text-secondary)]">
              Channel: <span className="font-semibold text-[var(--color-text-primary)]">{campaign.channel}</span> · Status:{" "}
              <span className="rounded-full bg-[var(--color-bg-subtle)] px-2.5 py-0.5 font-semibold text-[var(--color-text-primary)]">
                {campaign.status.replace("_", " ")}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setEditing((value) => !value)}
              disabled={campaign.status !== "draft"}
              className="flex min-h-10 items-center gap-1.5 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-3 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-50"
            >
              <Edit3 className="h-4 w-4" /> {editing ? "Cancel editing" : "Edit draft"}
            </button>
            <button
              type="button"
              onClick={() => void duplicate()}
              className="flex min-h-10 items-center gap-1.5 rounded-[var(--radius-control)] bg-[var(--color-action-primary)] px-3 text-sm font-bold text-[var(--color-action-on-primary)] hover:bg-[var(--color-action-hover)]"
            >
              <Copy className="h-4 w-4" /> Duplicate
            </button>
          </div>
        </div>
      </div>

      {message && (
        <p role="status" className="rounded-[var(--radius-control)] bg-[var(--color-bg-subtle)] px-4 py-3 text-sm text-[var(--color-text-primary)]">
          {message}
        </p>
      )}

      {editing ? (
        <form noValidate onSubmit={save} className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5 sm:p-6">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Edit Campaign Draft</h2>
          <label className="mt-4 block text-sm font-semibold text-[var(--color-text-primary)]">
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} className={`${field} mt-1.5`} />
          </label>

          <label className="mt-4 block text-sm font-semibold text-[var(--color-text-primary)]">
            Apply compatible template
            <select defaultValue="" onChange={(event) => applyTemplate(event.target.value)} className={`${field} mt-1.5`}>
              <option value="">Choose a template</option>
              {templates
                .filter((template) => template.channel === campaign.channel)
                .map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
            </select>
          </label>
          <p className="mt-1.5 flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
            <ChevronDown className="h-3 w-3" /> Applying a template copies its subject and body.
          </p>

          {campaign.channel === "email" && (
            <label className="mt-4 block text-sm font-semibold text-[var(--color-text-primary)]">
              Subject
              <input value={subject} onChange={(event) => setSubject(event.target.value)} className={`${field} mt-1.5`} />
            </label>
          )}

          <label className="mt-4 block text-sm font-semibold text-[var(--color-text-primary)]">
            Message
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={8}
              className="mt-1.5 w-full rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-transparent p-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-control)]"
            />
          </label>

          <div className="mt-5 flex gap-2">
            <button
              type="submit"
              className="min-h-11 rounded-[var(--radius-control)] bg-[var(--color-action-primary)] px-5 text-sm font-bold text-[var(--color-action-on-primary)] hover:bg-[var(--color-action-hover)]"
            >
              Save draft
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="min-h-11 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] px-4 text-sm font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          <section className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5">
            <h2 className="text-base font-bold text-[var(--color-text-primary)]">Message preview</h2>
            <div className="mt-3 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)] p-4">
              <p className="font-semibold text-[var(--color-text-primary)]">{campaign.subject || "Message"}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text-secondary)]">
                {campaign.snapshot?.body ?? campaign.body}
              </p>
            </div>
          </section>

          <section className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5">
            <h2 className="text-base font-bold text-[var(--color-text-primary)]">Approval snapshot</h2>
            <div className="mt-3 rounded-[var(--radius-control)] bg-[var(--color-bg-subtle)] p-4 text-sm text-[var(--color-text-secondary)]">
              {campaign.snapshot ? (
                <>
                  <p className="text-xl font-bold text-[var(--color-text-primary)]">{campaign.snapshot.recipientCount}</p>
                  <p className="mt-1 text-xs">Recipients frozen at approval time.</p>
                </>
              ) : (
                <p>No immutable snapshot exists until the campaign is approved.</p>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Delivery Tracking Section */}
      <section className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Delivery tracking</h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {delivery?.summary.providerConfigured
                ? "Active delivery provider connected."
                : "External delivery provider not configured; messages remain in queue safely."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadDelivery()}
            className="flex min-h-10 items-center gap-1.5 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] px-3 text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>

        {deliveryError && (
          <p role="alert" className="mt-3 text-sm text-[var(--color-status-error)]">
            {deliveryError}
          </p>
        )}

        {!delivery && !deliveryError && (
          <p className="mt-4 text-sm text-[var(--color-text-secondary)]">Loading delivery records…</p>
        )}

        {delivery && Object.keys(delivery.summary.byStatus).length === 0 && (
          <p className="mt-4 rounded-[var(--radius-control)] border border-dashed border-[var(--color-border-control)] p-6 text-center text-sm text-[var(--color-text-secondary)]">
            No delivery records yet. Deliveries enqueue when the campaign is approved and dispatched.
          </p>
        )}

        {delivery && Object.keys(delivery.summary.byStatus).length > 0 && (
          <>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {Object.entries(delivery.summary.byStatus).map(([statusKey, count]) => (
                <span
                  key={statusKey}
                  className="rounded-full bg-[var(--color-bg-subtle)] px-3 py-1 font-semibold capitalize text-[var(--color-text-primary)]"
                >
                  {statusKey}: {count}
                </span>
              ))}
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)]/45 text-xs text-[var(--color-text-secondary)]">
                  <tr>
                    <th className="py-2.5 px-3 font-medium">Channel</th>
                    <th className="py-2.5 px-3 font-medium">Status</th>
                    <th className="py-2.5 px-3 font-medium">Attempts</th>
                    <th className="py-2.5 px-3 font-medium">Details</th>
                    <th className="py-2.5 px-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-subtle)]">
                  {delivery.deliveries.items.map((item) => (
                    <tr key={item._id} className="hover:bg-[var(--color-bg-subtle)]/30">
                      <td className="py-3 px-3 uppercase text-xs font-semibold">{item.channel}</td>
                      <td className="py-3 px-3">
                        <span className="rounded-full bg-[var(--color-bg-subtle)] px-2 py-0.5 text-xs font-semibold capitalize">
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-xs">{item.attemptCount}</td>
                      <td className="py-3 px-3 text-xs text-[var(--color-text-secondary)]">
                        {item.safeError ??
                          (item.nextAttemptAt ? `Retry: ${new Date(item.nextAttemptAt).toLocaleTimeString()}` : "—")}
                      </td>
                      <td className="py-3 px-3">
                        {item.status === "failed" && (
                          <button
                            type="button"
                            disabled={deliveryBusy === item._id}
                            onClick={() => setDeliveryConfirmation({ id: item._id, action: "retry" })}
                            className="mr-2 text-xs font-semibold text-[var(--color-action-primary)] hover:underline disabled:opacity-50"
                          >
                            Retry
                          </button>
                        )}
                        {["pending", "failed"].includes(item.status) && (
                          <button
                            type="button"
                            disabled={deliveryBusy === item._id}
                            onClick={() => setDeliveryConfirmation({ id: item._id, action: "cancel" })}
                            className="text-xs font-semibold text-[var(--color-status-error)] hover:underline disabled:opacity-50"
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
          </>
        )}
      </section>
      <MarketingDialog
        open={Boolean(deliveryConfirmation)}
        tone={deliveryConfirmation?.action === "cancel" ? "warning" : "info"}
        title={deliveryConfirmation?.action === "cancel" ? "Cancel delivery?" : "Retry delivery?"}
        description={deliveryConfirmation?.action === "cancel" ? "This recipient will not receive the queued campaign message." : "The delivery will return to the queue and be attempted again when the provider is available."}
        confirmLabel={deliveryConfirmation?.action === "cancel" ? "Cancel delivery" : "Retry delivery"}
        busy={Boolean(deliveryConfirmation && deliveryBusy === deliveryConfirmation.id)}
        onCancel={() => setDeliveryConfirmation(null)}
        onConfirm={() => deliveryConfirmation && void deliveryAction(deliveryConfirmation.id, deliveryConfirmation.action)}
      />
    </div>
  );
}
