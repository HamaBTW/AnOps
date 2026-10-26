"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  approveCampaignAction,
  cancelCampaignAction,
  deleteCampaignAction,
  duplicateCampaignAction,
  returnCampaignAction,
  scheduleCampaignAction,
  submitCampaignAction,
} from "@/features/marketing/actions/campaigns.action";
import { Button } from "@/shared/components/ui/button";
import { FormMessage } from "@/shared/components/ui/form-message";
import type { CampaignDto } from "@/server/marketing/campaign.service";
import Link from "next/link";

/** Converts a Tunisia-local datetime-local value to an ISO instant. Tunisia has no daylight saving time (UTC+1). */
export function tunisiaLocalToIso(value: string): string {
  return value ? new Date(`${value}:00+01:00`).toISOString() : "";
}

/**
 * Lifecycle controls. Each button maps to one server action, which re-checks permission and the current
 * state. The buttons shown here only reflect what the server reported for this user.
 */
export function CampaignActions({
  campaign,
  providerReady,
  channelLabel,
}: {
  campaign: CampaignDto;
  providerReady: boolean;
  channelLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [when, setWhen] = useState("");
  const actions = campaign.actions;
  const version = campaign.version;

  const run = (task: () => Promise<{ ok: boolean; error?: { message: string }; data?: unknown }>, success: string, after?: (data: unknown) => void) =>
    startTransition(async () => {
      setNotice(null);
      const result = await task();
      if (!result.ok) return setNotice({ kind: "error", text: result.error?.message ?? "Something went wrong." });
      setNotice({ kind: "success", text: success });
      if (after) after(result.data);
      router.refresh();
    });

  const none = !actions.canSubmit && !actions.canReturn && !actions.canApprove && !actions.canSchedule && !actions.canCancel && !actions.canDelete && !actions.canDuplicate;

  return (
    <section aria-labelledby="campaign-actions" className="space-y-4 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5">
      <h2 id="campaign-actions" className="text-base font-semibold">Lifecycle</h2>
      {notice && <FormMessage kind={notice.kind}>{notice.text}</FormMessage>}
      {none && <p className="text-sm text-[var(--color-text-secondary)]">No actions are available for your role in this state.</p>}

      <div className="flex flex-wrap gap-2">
        {actions.canSubmit && (
          <Button variant="primary" disabled={pending} onClick={() => run(() => submitCampaignAction(campaign.id, { expectedVersion: version }), "Sent for approval. The content is now locked.")}>
            Submit for approval
          </Button>
        )}
        {actions.canApprove && (
          <Button variant="primary" disabled={pending} onClick={() => run(() => approveCampaignAction(campaign.id, { expectedVersion: version }), "Approved. Recipients are now fixed for this campaign.")}>
            Approve and freeze recipients
          </Button>
        )}
        {actions.canReturn && (
          <Button disabled={pending} onClick={() => run(() => returnCampaignAction(campaign.id, { expectedVersion: version }), "Returned to draft.")}>
            Return to draft
          </Button>
        )}
        {actions.canDuplicate && (
          <Button disabled={pending} onClick={() => run(() => duplicateCampaignAction(campaign.id), "Copied as a new draft.", (data) => {
            const copy = data as { id: string };
            router.push(`/marketing/campaigns/${copy.id}`);
          })}>
            Duplicate
          </Button>
        )}
        {actions.canDelete && (
          <Button variant="danger" disabled={pending} onClick={() => {
            if (!window.confirm("Delete this draft? This cannot be undone.")) return;
            startTransition(async () => {
              const result = await deleteCampaignAction(campaign.id);
              if (!result.ok) return setNotice({ kind: "error", text: result.error.message });
              router.push("/marketing/campaigns");
              router.refresh();
            });
          }}>
            Delete draft
          </Button>
        )}
        {actions.canCancel && (
          <Button variant="danger" disabled={pending} onClick={() => {
            if (!window.confirm("Cancel this campaign? Recipients will not be contacted.")) return;
            run(() => cancelCampaignAction(campaign.id, { expectedVersion: version }), "Campaign cancelled.");
          }}>
            Cancel campaign
          </Button>
        )}
      </div>

      {actions.canSchedule && (
        <div className="space-y-3 rounded-[var(--radius-control)] bg-[var(--color-bg-subtle)] p-4">
          <p className="text-sm font-semibold">Schedule sending</p>
          {!providerReady ? (
            <div role="status" className="space-y-1 text-sm text-[var(--color-text-primary)]">
              <p className="font-semibold text-[var(--color-status-warning)]">Sending is unavailable</p>
              <p>
                No {channelLabel} provider is connected on this server. Nothing will be sent, and this campaign can&apos;t be scheduled until one is.{" "}
                <Link className="underline" href="/marketing/integrations">See integrations</Link>
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="space-y-1.5">
                  <label htmlFor="when" className="text-sm font-semibold">Send at (Tunisia time, optional)</label>
                  <input id="when" type="datetime-local" value={when} onChange={(event) => setWhen(event.target.value)} className="min-h-[44px] w-full rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] px-3 text-sm sm:w-auto" />
                </div>
                <Button variant="primary" disabled={pending} onClick={() => run(() => scheduleCampaignAction(campaign.id, { scheduledAt: tunisiaLocalToIso(when), expectedVersion: version }), when ? "Scheduled." : "Queued to send now.")}>
                  {when ? "Schedule" : "Send now"}
                </Button>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)]">Leave the time empty to send as soon as the background worker runs. Each recipient is checked again just before sending.</p>
            </>
          )}
        </div>
      )}
      {!actions.canSchedule && campaign.status === "approved" && !actions.canApprove && (
        <p className="text-sm text-[var(--color-text-secondary)]">Only owners and admins can schedule sending.</p>
      )}
    </section>
  );
}
