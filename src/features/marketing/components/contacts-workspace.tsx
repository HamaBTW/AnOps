"use client";

import { FormEvent, useEffect, useState } from "react";
import { Download, Plus, Search, Tag, ShieldCheck, UserRound, UserRoundCheck, UserRoundX, X } from "lucide-react";
import type { ContactListResult, MarketingContact, ContactTag, ConsentRecord } from "@/features/marketing/types";
import { contactInputSchema, tagInputSchema, consentRecordSchema } from "@/features/marketing/schemas/marketing.schema";
import { validateMarketingInput } from "@/features/marketing/lib/client-validation";

const fieldClass =
  "h-11 w-full rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-transparent px-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-control)]";

export function ContactsWorkspace({ initialData }: { initialData: ContactListResult }) {
  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Tags state
  const [tags, setTags] = useState<ContactTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [showTagModal, setShowTagModal] = useState(false);

  // Consent modal state
  const [consentContact, setConsentContact] = useState<MarketingContact | null>(null);
  const [consentHistory, setConsentHistory] = useState<ConsentRecord[]>([]);
  const [consentChannel, setConsentChannel] = useState<"email" | "sms">("email");
  const [consentPurpose, setConsentPurpose] = useState("Marketing Updates");
  const [consentStatus, setConsentStatus] = useState<"granted" | "revoked">("granted");

  async function loadTags() {
    const res = await fetch("/api/marketing/tags");
    if (res.ok) setTags(await res.json());
  }

  useEffect(() => {
    void loadTags();
  }, []);

  async function refresh(nextSearch = search, nextStage = stageFilter) {
    const params = new URLSearchParams();
    if (nextSearch) params.set("search", nextSearch);
    if (nextStage !== "all") params.set("lifecycleStage", nextStage);
    const response = await fetch(`/api/marketing/contacts?${params.toString()}`, { cache: "no-store" });
    if (response.ok) setData((await response.json()) as ContactListResult);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const validation = validateMarketingInput(contactInputSchema, {
      firstName: form.get("firstName"), lastName: form.get("lastName"), email: form.get("email"), phone: form.get("phone"),
      source: form.get("source"), lifecycleStage: form.get("lifecycleStage"), tagIds: selectedTagIds,
    });
    if ("error" in validation) { setError(validation.error); setIsSaving(false); return; }
    const response = await fetch("/api/marketing/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validation.data),
    });
    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      setError(body.error ?? "Unable to save contact.");
      setIsSaving(false);
      return;
    }
    setShowForm(false);
    setSelectedTagIds([]);
    setIsSaving(false);
    await refresh();
  }

  async function toggle(contact: MarketingContact) {
    await fetch(`/api/marketing/contacts/${contact.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !contact.isActive }),
    });
    await refresh();
  }

  async function createNewTag() {
    const validation = validateMarketingInput(tagInputSchema, { name: newTagName });
    if ("error" in validation) { setError(validation.error); return; }
    const res = await fetch("/api/marketing/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validation.data),
    });
    if (res.ok) {
      setNewTagName("");
      await loadTags();
    }
  }

  async function openConsentModal(contact: MarketingContact) {
    setConsentContact(contact);
    const res = await fetch(`/api/marketing/contacts/${contact.id}/consent`);
    if (res.ok) setConsentHistory(await res.json());
  }

  async function recordNewConsent() {
    if (!consentContact) return;
    const validation = validateMarketingInput(consentRecordSchema, {
      channel: consentChannel, purpose: consentPurpose, status: consentStatus, source: "Admin Portal",
    });
    if ("error" in validation) { setError(validation.error); return; }
    const res = await fetch(`/api/marketing/contacts/${consentContact.id}/consent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validation.data),
    });
    if (res.ok) {
      const historyRes = await fetch(`/api/marketing/contacts/${consentContact.id}/consent`);
      if (historyRes.ok) setConsentHistory(await historyRes.json());
    }
  }

  return (
    <div className="space-y-6 reveal">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
            Marketing & Socials
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
            Contacts
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            A canonical, consent-governed contact list for your multi-channel campaigns.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/marketing/contacts/export"
            className="flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-4 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]"
          >
            <Download className="h-4 w-4" /> Export CSV
          </a>
          <button
            type="button"
            onClick={() => setShowTagModal(true)}
            className="flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-4 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]"
          >
            <Tag className="h-4 w-4" /> Manage Tags
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedTagIds([]);
              setShowForm(true);
            }}
            className="flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--color-action-primary)] px-4 text-sm font-bold text-[var(--color-action-on-primary)] hover:bg-[var(--color-action-hover)]"
          >
            <Plus className="h-4 w-4" /> Add contact
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat icon={UserRound} label="Total contacts" value={data.total.toString()} />
        <Stat
          icon={UserRoundCheck}
          label="Active contacts"
          value={data.items.filter((contact) => contact.isActive).length.toString()}
        />
        <Stat icon={UserRoundX} label="On this page" value={data.items.length.toString()} />
      </section>

      <section className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
        <div className="flex flex-col gap-3 border-b border-[var(--color-border-subtle)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-secondary)]" />
            <input
              aria-label="Search contacts"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                void refresh(event.target.value, stageFilter);
              }}
              placeholder="Search by name, email, or phone"
              className={`${fieldClass} pl-9`}
            />
          </div>
          <select
            value={stageFilter}
            onChange={(e) => {
              setStageFilter(e.target.value);
              void refresh(search, e.target.value);
            }}
            aria-label="Filter by lifecycle stage"
            className={`${fieldClass} sm:w-44`}
          >
            <option value="all">All stages</option>
            <option value="lead">Lead</option>
            <option value="prospect">Prospect</option>
            <option value="customer">Customer</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)]/45 text-xs text-[var(--color-text-secondary)]">
              <tr>
                <th className="px-5 py-3 font-medium">Contact</th>
                <th className="px-3 py-3 font-medium">Stage</th>
                <th className="px-3 py-3 font-medium">Source</th>
                <th className="px-3 py-3 font-medium">Tags</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Consent</th>
                <th className="px-3 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-subtle)]">
              {data.items.map((contact) => (
                <tr key={contact.id} className="hover:bg-[var(--color-bg-subtle)]/40">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-[var(--color-text-primary)]">
                      {contact.firstName} {contact.lastName}
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {contact.email ?? contact.phone ?? "No contact detail"}
                    </p>
                  </td>
                  <td className="px-3 py-4 capitalize text-[var(--color-text-primary)]">{contact.lifecycleStage}</td>
                  <td className="px-3 py-4 text-[var(--color-text-secondary)]">{contact.source}</td>
                  <td className="px-3 py-4">
                    <div className="flex flex-wrap gap-1">
                      {contact.tags.map((t) => (
                        <span
                          key={t.id}
                          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                          style={{ backgroundColor: `${t.color}25`, color: "var(--color-text-primary)" }}
                        >
                          {t.name}
                        </span>
                      ))}
                      {contact.tags.length === 0 && <span className="text-xs text-[var(--color-text-secondary)]">—</span>}
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        contact.isActive
                          ? "bg-[var(--color-status-success-bg)] text-[var(--color-status-success)]"
                          : "bg-[var(--color-status-neutral-bg)] text-[var(--color-status-neutral)]"
                      }`}
                    >
                      {contact.isActive ? "Active" : "Archived"}
                    </span>
                  </td>
                  <td className="px-3 py-4">
                    <button
                      type="button"
                      onClick={() => void openConsentModal(contact)}
                      className="flex items-center gap-1 text-xs font-semibold text-[var(--color-action-primary)] hover:underline"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" /> History
                    </button>
                  </td>
                  <td className="px-3 py-4">
                    <button
                      type="button"
                      onClick={() => void toggle(contact)}
                      className="min-h-9 rounded-[var(--radius-control)] px-3 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]"
                    >
                      {contact.isActive ? "Archive" : "Reactivate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.items.length === 0 && (
          <p className="p-10 text-center text-sm text-[var(--color-text-secondary)]">
            No contacts found. Add your first contact or clear filters to start building an audience.
          </p>
        )}
      </section>

      {/* Add Contact Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6">
          <form
            onSubmit={submit}
            noValidate
            className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5 shadow-2xl sm:rounded-[var(--radius-card)]"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Add contact</h2>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  Only this authenticated workspace can access this record.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="min-h-11 px-3 text-sm text-[var(--color-text-secondary)]"
              >
                Close
              </button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-[var(--color-text-primary)]">
                First name
                <input name="firstName" className={`${fieldClass} mt-1.5`} />
              </label>
              <label className="text-sm font-semibold text-[var(--color-text-primary)]">
                Last name
                <input name="lastName" className={`${fieldClass} mt-1.5`} />
              </label>
              <label className="text-sm font-semibold text-[var(--color-text-primary)]">
                Email
                <input name="email" type="email" className={`${fieldClass} mt-1.5`} />
              </label>
              <label className="text-sm font-semibold text-[var(--color-text-primary)]">
                Phone
                <input name="phone" className={`${fieldClass} mt-1.5`} />
              </label>
              <label className="text-sm font-semibold text-[var(--color-text-primary)]">
                Lead source
                <input name="source" placeholder="Website, referral…" className={`${fieldClass} mt-1.5`} />
              </label>
              <label className="text-sm font-semibold text-[var(--color-text-primary)]">
                Lifecycle stage
                <select name="lifecycleStage" defaultValue="lead" className={`${fieldClass} mt-1.5`}>
                  <option value="lead">Lead</option>
                  <option value="prospect">Prospect</option>
                  <option value="customer">Customer</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>

              {/* Tags Selector */}
              <div className="sm:col-span-2">
                <span className="block text-sm font-semibold text-[var(--color-text-primary)]">Tags</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {tags.map((tag) => {
                    const isSelected = selectedTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => {
                          setSelectedTagIds((prev) =>
                            isSelected ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]
                          );
                        }}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                          isSelected
                            ? "bg-[var(--color-action-primary)] text-[var(--color-action-on-primary)] ring-2 ring-[var(--color-action-primary)]"
                            : "border border-[var(--color-border-control)] bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]"
                        }`}
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                  {tags.length === 0 && (
                    <span className="text-xs text-[var(--color-text-secondary)]">No tags created yet.</span>
                  )}
                </div>
              </div>
            </div>
            {error && (
              <p
                role="alert"
                className="mt-4 rounded-[var(--radius-control)] bg-[var(--color-status-error-bg)] px-3 py-2 text-sm text-[var(--color-status-error)]"
              >
                {error}
              </p>
            )}
            <button
              disabled={isSaving}
              type="submit"
              className="mt-5 flex min-h-11 w-full items-center justify-center rounded-[var(--radius-control)] bg-[var(--color-action-primary)] text-sm font-bold text-[var(--color-action-on-primary)] disabled:opacity-50"
            >
              {isSaving ? "Saving…" : "Save contact"}
            </button>
          </form>
        </div>
      )}

      {/* Manage Tags Modal */}
      {showTagModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-[var(--radius-card)] bg-[var(--color-bg-surface)] p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Manage Tags</h2>
              <button type="button" onClick={() => setShowTagModal(false)} className="p-1 text-[var(--color-text-secondary)]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 flex gap-2">
              <input
                placeholder="New tag name"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className={`${fieldClass} flex-1`}
              />
              <button
                type="button"
                onClick={() => void createNewTag()}
                className="rounded-[var(--radius-control)] bg-[var(--color-action-primary)] px-4 text-sm font-bold text-[var(--color-action-on-primary)]"
              >
                Create
              </button>
            </div>
            <div className="mt-4 max-h-60 space-y-2 overflow-y-auto">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center justify-between rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] p-2.5 text-sm"
                >
                  <span className="font-semibold text-[var(--color-text-primary)]">{tag.name}</span>
                  <span className="text-xs text-[var(--color-text-secondary)]">{tag.contactCount ?? 0} contacts</span>
                </div>
              ))}
              {tags.length === 0 && <p className="text-xs text-[var(--color-text-secondary)]">No tags yet.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Consent History Modal */}
      {consentContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[var(--radius-card)] bg-[var(--color-bg-surface)] p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Consent & Suppression</h2>
                <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                  {consentContact.firstName} {consentContact.lastName} ({consentContact.email ?? consentContact.phone})
                </p>
              </div>
              <button type="button" onClick={() => setConsentContact(null)} className="p-1 text-[var(--color-text-secondary)]">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Record New Consent Form */}
            <div className="mt-4 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)]/30 p-4">
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">Record Consent Decision</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <label className="text-xs font-semibold">
                  Channel
                  <select
                    value={consentChannel}
                    onChange={(e) => setConsentChannel(e.target.value as any)}
                    className={`${fieldClass} mt-1`}
                  >
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                  </select>
                </label>
                <label className="text-xs font-semibold">
                  Status
                  <select
                    value={consentStatus}
                    onChange={(e) => setConsentStatus(e.target.value as any)}
                    className={`${fieldClass} mt-1`}
                  >
                    <option value="granted">Granted</option>
                    <option value="revoked">Revoked</option>
                  </select>
                </label>
                <label className="text-xs font-semibold">
                  Purpose
                  <input
                    value={consentPurpose}
                    onChange={(e) => setConsentPurpose(e.target.value)}
                    className={`${fieldClass} mt-1`}
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() => void recordNewConsent()}
                className="mt-3 w-full rounded-[var(--radius-control)] bg-[var(--color-action-primary)] py-2 text-xs font-bold text-[var(--color-action-on-primary)]"
              >
                Save Consent Decision
              </button>
            </div>

            {/* History Log */}
            <div className="mt-5 space-y-2">
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">Audit Trail</h3>
              {consentHistory.map((rec) => (
                <div
                  key={rec.id}
                  className="rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] p-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold uppercase">{rec.channel}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        rec.status === "granted"
                          ? "bg-[var(--color-status-success-bg)] text-[var(--color-status-success)]"
                          : "bg-[var(--color-status-error-bg)] text-[var(--color-status-error)]"
                      }`}
                    >
                      {rec.status}
                    </span>
                  </div>
                  <p className="mt-1 text-[var(--color-text-secondary)]">Purpose: {rec.purpose} · Source: {rec.source}</p>
                  <p className="mt-1 text-[10px] text-[var(--color-text-secondary)]">
                    Recorded: {new Date(rec.recordedAt).toLocaleString()}
                    {rec.withdrawnAt && ` · Withdrawn: ${new Date(rec.withdrawnAt).toLocaleString()}`}
                  </p>
                </div>
              ))}
              {consentHistory.length === 0 && (
                <p className="text-xs text-[var(--color-text-secondary)]">No consent records logged for this contact.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4">
      <Icon className="h-4 w-4 text-[var(--color-text-secondary)]" />
      <p className="mt-3 text-2xl font-semibold text-[var(--color-text-primary)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{label}</p>
    </div>
  );
}
