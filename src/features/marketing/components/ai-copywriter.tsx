"use client";

import { FormEvent, useState } from "react";
import { Bot, CheckCircle2, Copy, Sparkles } from "lucide-react";
import { aiCopyInputSchema } from "@/features/marketing/schemas/ai.schema";
import { validateMarketingInput } from "@/features/marketing/lib/client-validation";

const field =
  "h-11 w-full rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-transparent px-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-control)]";

export function AICopywriter({
  history,
}: {
  history: Array<{ _id: string; status: string; safeError?: string }>;
}) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const validation = validateMarketingInput(aiCopyInputSchema, {
      ...Object.fromEntries(form.entries()), maxLength: 500, variations: 2,
    });
    if ("error" in validation) { setMessage(validation.error); setLoading(false); return; }
    const response = await fetch("/api/marketing/ai-copy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validation.data),
    });
    const data = (await response.json()) as { error?: string };
    setMessage(response.ok ? "Copy generated successfully." : data.error ?? "AI provider is currently unavailable.");
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 reveal">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
          Marketing & Socials
        </p>
        <h1 className="mt-2 flex items-center gap-2.5 text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
          <Sparkles className="h-7 w-7 text-[var(--color-action-primary)]" /> AI Copywriter
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Draft optimized campaign and social copy backed by rotating LLM providers.
        </p>
      </header>

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4 text-sm text-[var(--color-text-secondary)]">
        <div className="flex items-center gap-2 font-semibold text-[var(--color-text-primary)]">
          <Bot className="h-4 w-4 text-[var(--color-action-primary)]" /> Provider State
        </div>
        <p className="mt-1 text-xs">
          Requests route through Groq, OpenRouter, and Gemini with intelligent fallback. Truthful error states are
          enforced when credentials are absent.
        </p>
      </div>

      <form
        onSubmit={generate}
        noValidate
        className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5 sm:p-6"
      >
        <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Compose Brief</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-[var(--color-text-primary)]">
            Channel / Platform
            <select name="platform" className={`${field} mt-1.5`}>
              <option value="email">Email Campaign</option>
              <option value="sms">SMS Notification</option>
              <option value="facebook">Facebook Post</option>
              <option value="instagram">Instagram Caption</option>
              <option value="linkedin">LinkedIn Update</option>
            </select>
          </label>

          <label className="text-sm font-semibold text-[var(--color-text-primary)]">
            Objective
            <select name="objective" className={`${field} mt-1.5`}>
              <option value="promotion">Seasonal Promotion</option>
              <option value="announcement">Product Announcement</option>
              <option value="product">Product Highlight</option>
              <option value="event">Event Invitation</option>
              <option value="engagement">Community Engagement</option>
              <option value="custom">Custom Objective</option>
            </select>
          </label>

          <label className="text-sm font-semibold text-[var(--color-text-primary)] sm:col-span-2">
            Topic or Product Name
            <input
              name="topic"
              placeholder="e.g. Organic Extra Virgin Olive Oil harvest"
              className={`${field} mt-1.5`}
            />
          </label>

          <label className="text-sm font-semibold text-[var(--color-text-primary)]">
            Target Audience
            <input
              name="audience"
              placeholder="e.g. Existing culinary partners, organic food shoppers"
              className={`${field} mt-1.5`}
            />
          </label>

          <label className="text-sm font-semibold text-[var(--color-text-primary)]">
            Brand Tone
            <select name="tone" className={`${field} mt-1.5`}>
              <option value="professional">Professional & Direct</option>
              <option value="friendly">Warm & Welcoming</option>
              <option value="persuasive">Persuasive & Action-Oriented</option>
              <option value="informative">Educational & Informative</option>
              <option value="creative">Creative & Narrative</option>
            </select>
          </label>

          <label className="text-sm font-semibold text-[var(--color-text-primary)]">
            Language
            <select name="language" className={`${field} mt-1.5`}>
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="ar">العربية</option>
            </select>
          </label>

          <label className="text-sm font-semibold text-[var(--color-text-primary)]">
            Call to Action (Optional)
            <input name="callToAction" placeholder="e.g. Shop the fresh harvest today" className={`${field} mt-1.5`} />
          </label>
        </div>

        {message && (
          <p role="status" className="mt-4 rounded-[var(--radius-control)] bg-[var(--color-bg-subtle)] p-3 text-sm text-[var(--color-text-primary)]">
            {message}
          </p>
        )}

        <button
          disabled={loading}
          type="submit"
          className="mt-6 flex min-h-11 items-center justify-center rounded-[var(--radius-control)] bg-[var(--color-action-primary)] px-6 text-sm font-bold text-[var(--color-action-on-primary)] hover:bg-[var(--color-action-hover)] disabled:opacity-50"
        >
          {loading ? "Generating Draft..." : "Generate copy"}
        </button>
      </form>

      <section className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5 sm:p-6">
        <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Recent Generations</h2>
        {history.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--color-text-secondary)]">No generation requests recorded yet.</p>
        ) : (
          <div className="mt-4 space-y-2.5">
            {history.map((item) => (
              <div
                key={item._id}
                className="flex items-center justify-between rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] p-3.5 text-sm"
              >
                <div>
                  <span className="font-semibold capitalize text-[var(--color-text-primary)]">
                    {item.status.replace("_", " ")}
                  </span>
                  {item.safeError && <p className="mt-0.5 text-xs text-[var(--color-status-error)]">{item.safeError}</p>}
                </div>
                <span className="font-mono text-xs text-[var(--color-text-secondary)]">{item._id.slice(-6)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
