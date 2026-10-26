import type { Metadata } from "next";
import { getPageWorkspace } from "@/server/tenancy/workspace";
import { PageHeader } from "@/shared/components/data-display/page-header";
import { StatusBadge } from "@/shared/components/data-display/status-badge";
import { getConfiguredProviders } from "@/server/marketing/providers";
import { getSocialConfig, getWebhookSecret, getWorkerSecret } from "@/server/marketing/config";
import { ai } from "@/server/ai";
import { PERMISSIONS } from "@/server/security/permissions";
import { PermissionDenied } from "@/shared/components/data-display/permission-denied";

export const metadata: Metadata = { title: "Integrations | AnOps ERP" };

type Row = { name: string; state: "ready" | "setup" | "partial"; detail: string; setup?: string[] };

/**
 * Shows which integrations are live. Only booleans and variable NAMES are shown. No value, length or
 * hint of a secret ever reaches the page.
 */
export default async function IntegrationsPage() {
  const ctx = await getPageWorkspace();
  if (!ctx.permissions.has(PERMISSIONS.MARKETING_READ)) {
    return <PermissionDenied backHref="/marketing" backLabel="Back to marketing" />;
  }
  const providers = getConfiguredProviders();
  const social = getSocialConfig();
  const aiProviders = ai.status();
  const aiAvailable = aiProviders.filter((provider) => provider.available).map((provider) => provider.name);

  const rows: Row[] = [
    {
      name: "Email delivery",
      state: providers.email ? "ready" : "setup",
      detail: providers.email ? `Connected: ${providers.email.name}` : "No provider adapter is connected. Campaigns cannot be scheduled and nothing is sent.",
      setup: providers.email ? undefined : ["Implement a MessageProvider for email, register it in server/marketing/providers.ts, and configure its credentials."],
    },
    {
      name: "SMS delivery",
      state: providers.sms ? "ready" : "setup",
      detail: providers.sms ? `Connected: ${providers.sms.name}` : "No provider adapter is connected. SMS campaigns cannot be scheduled.",
      setup: providers.sms ? undefined : ["Implement a MessageProvider for SMS, register it, and configure its credentials."],
    },
    {
      name: "Facebook Pages",
      state: social.configured ? "ready" : "setup",
      detail: social.configured ? "OAuth and publishing are configured. Connect a Page from Social." : social.reason,
      setup: social.configured ? undefined : social.missing,
    },
    {
      name: "AI copywriter",
      state: aiAvailable.length > 0 ? "ready" : "setup",
      detail: aiAvailable.length > 0 ? `Available through: ${aiAvailable.join(", ")}` : "No AI provider key is configured. Generation is disabled.",
      setup: aiAvailable.length > 0 ? undefined : ["GROQ_API_KEYS", "OPENROUTER_API_KEY", "GEMINI_API_KEYS (any one)"],
    },
    {
      name: "Background worker",
      state: getWorkerSecret() ? "partial" : "setup",
      detail: getWorkerSecret()
        ? "The worker endpoint is enabled. Confirm that an external scheduler calls it every minute; this page cannot verify the schedule."
        : "The worker endpoint is disabled. Scheduled campaigns and posts will not run.",
      setup: getWorkerSecret() ? undefined : ["MARKETING_WORKER_SECRET (32+ characters)"],
    },
    {
      name: "Delivery webhooks",
      state: getWebhookSecret() ? "partial" : "setup",
      detail: getWebhookSecret()
        ? "Signed webhook receiver is enabled. Verified only when a provider sends signed events."
        : "The receiver is disabled, so bounces and opens will not be recorded.",
      setup: getWebhookSecret() ? undefined : ["MARKETING_WEBHOOK_SECRET (32+ characters)"],
    },
  ];

  const tone = { ready: "success", partial: "warning", setup: "neutral" } as const;
  const label = { ready: "Ready", partial: "Enabled, not verified", setup: "Setup needed" } as const;

  return (
    <div className="space-y-6">
      <PageHeader title="Integrations" description="What is connected, and what is still needed. Secret values are never shown." />
      <ul className="divide-y divide-[var(--color-border-subtle)] rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
        {rows.map((row) => (
          <li key={row.name} className="space-y-2 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-semibold">{row.name}</h2>
              <StatusBadge label={label[row.state]} tone={tone[row.state]} />
            </div>
            <p className="text-sm text-[var(--color-text-secondary)]">{row.detail}</p>
            {row.setup && row.setup.length > 0 && (
              <p className="text-xs text-[var(--color-text-secondary)]">Needed: <span className="font-mono">{row.setup.join(", ")}</span></p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
