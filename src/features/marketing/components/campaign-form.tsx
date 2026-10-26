"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useForm, type Resolver } from "react-hook-form";
import type { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { campaignInputSchema } from "@/features/marketing/schemas/marketing.schema";
import { createCampaignAction, updateCampaignAction } from "@/features/marketing/actions/campaigns.action";
import { Button, selectClass } from "@/shared/components/ui/button";
import { FormMessage } from "@/shared/components/ui/form-message";
import { TextField } from "@/shared/components/ui/text-field";
import { CHANNEL_LABELS } from "@/features/marketing/labels";
import { MARKETING_CHANNELS, type MarketingChannel } from "@/features/marketing/types/constants";
import { renderTemplate, smsSegmentCount, SMS_BODY_MAX, SMS_OPT_OUT_FOOTER, TEMPLATE_VARIABLES, type TemplateVariable } from "@/features/marketing/utils/template";
import type { CampaignDto } from "@/server/marketing/campaign.service";

type CampaignFormValues = z.input<typeof campaignInputSchema>;

export type TemplateOption = { id: string; name: string; subject: string; body: string; version: number; channel: MarketingChannel };
export type AudienceOption = { id: string; name: string; isActive: boolean };

const SAMPLE: Record<TemplateVariable, string> = {
  first_name: "Amina",
  last_name: "Ben Ali",
  email: "amina@example.test",
  company_name: "Your company",
  unsubscribe_url: "#unsubscribe",
};

/**
 * Create and edit a campaign draft. Choosing a template copies its text into the draft, so the campaign
 * owns its content from then on. Once the campaign is approved, this form is no longer offered.
 */
export function CampaignForm({
  campaign,
  audiences,
  templates,
}: {
  campaign?: CampaignDto;
  audiences: AudienceOption[];
  templates: TemplateOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [templateChoice, setTemplateChoice] = useState<string>(campaign?.templateId ?? "");
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignInputSchema) as unknown as Resolver<CampaignFormValues>,
    mode: "onBlur",
    defaultValues: campaign
      ? {
          name: campaign.name,
          channel: campaign.channel,
          audienceId: campaign.audienceId,
          templateId: campaign.templateId ?? "",
          subject: campaign.subject,
          body: campaign.body,
        }
      : { name: "", channel: "email", audienceId: audiences[0]?.id ?? "", templateId: "", subject: "", body: "" },
  });
  const channel = watch("channel") as MarketingChannel;
  const subject = watch("subject") ?? "";
  const body = watch("body") ?? "";
  const usableTemplates = templates.filter((template) => template.channel === channel);

  const renderedBody = useMemo(() => renderTemplate(body, SAMPLE), [body]);
  const renderedSubject = useMemo(() => renderTemplate(subject, SAMPLE), [subject]);
  const smsText = `${renderedBody} ${SMS_OPT_OUT_FOOTER}`;

  const pickTemplate = (id: string) => {
    setTemplateChoice(id);
    const chosen = templates.find((template) => template.id === id);
    if (!chosen) {
      setValue("templateId", "", { shouldDirty: true });
      return;
    }
    setValue("templateId", chosen.id, { shouldDirty: true });
    setValue("subject", chosen.subject, { shouldDirty: true, shouldValidate: true });
    setValue("body", chosen.body, { shouldDirty: true, shouldValidate: true });
  };

  const submit = (values: CampaignFormValues) =>
    startTransition(async () => {
      setNotice(null);
      const payload = { ...values, subject: values.channel === "email" ? values.subject : "" };
      const result = campaign
        ? await updateCampaignAction(campaign.id, { ...payload, expectedVersion: campaign.version })
        : await createCampaignAction(payload);
      if (!result.ok) return setNotice({ kind: "error", text: result.error.message });
      if (campaign) {
        setNotice({ kind: "success", text: "Draft saved." });
        router.refresh();
      } else {
        router.push(`/marketing/campaigns/${result.data.id}`);
        router.refresh();
      }
    });

  return (
    <form noValidate onSubmit={handleSubmit(submit)} className="grid gap-6 xl:grid-cols-2">
      <div className="space-y-5">
        <TextField label="Campaign name" error={errors.name?.message} {...register("name")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="channel" className="text-sm font-semibold">Channel</label>
            <select id="channel" className={selectClass} disabled={Boolean(campaign)} {...register("channel")}>
              {MARKETING_CHANNELS.map((item) => <option key={item} value={item}>{CHANNEL_LABELS[item]}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="audienceId" className="text-sm font-semibold">Audience</label>
            <select id="audienceId" className={selectClass} {...register("audienceId")}>
              {audiences.length === 0 && <option value="">No audiences yet</option>}
              {audiences.map((audience) => (
                <option key={audience.id} value={audience.id} disabled={!audience.isActive}>
                  {audience.name}{audience.isActive ? "" : " (inactive)"}
                </option>
              ))}
            </select>
            {errors.audienceId?.message && <p role="alert" className="text-xs text-[#c0392b]">{errors.audienceId.message}</p>}
            {audiences.length === 0 && <p className="text-xs text-[var(--color-text-secondary)]"><Link className="underline" href="/marketing/audiences/new">Create an audience</Link> first.</p>}
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="templateChoice" className="text-sm font-semibold">Start from a template (optional)</label>
          <select id="templateChoice" className={selectClass} value={templateChoice} onChange={(event) => pickTemplate(event.target.value)}>
            <option value="">No template: write the message below</option>
            {usableTemplates.map((template) => <option key={template.id} value={template.id}>{template.name} (v{template.version})</option>)}
          </select>
          <p className="text-xs text-[var(--color-text-secondary)]">Choosing a template copies its text here. Edits in this campaign do not change the template.</p>
        </div>

        {channel === "email" && (
          <TextField label="Subject" maxLength={150} error={errors.subject?.message} {...register("subject")} />
        )}
        <div className="space-y-1.5">
          <label htmlFor="body" className="text-sm font-semibold">{channel === "email" ? "Message (plain text)" : "SMS message"}</label>
          <textarea id="body" rows={channel === "email" ? 9 : 5} aria-invalid={Boolean(errors.body)} className="w-full rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] p-3 text-sm focus:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)]" {...register("body")} />
          {errors.body?.message && <p role="alert" className="text-xs text-[#c0392b]">{errors.body.message}</p>}
          <p className="text-xs text-[var(--color-text-secondary)]">
            Variables: {TEMPLATE_VARIABLES.map((name) => `{{${name}}}`).join(" ")}
          </p>
        </div>

        {notice && <FormMessage kind={notice.kind}>{notice.text}</FormMessage>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Link href={campaign ? `/marketing/campaigns/${campaign.id}` : "/marketing/campaigns"} className="inline-flex min-h-[44px] items-center justify-center rounded-[var(--radius-control)] border border-[var(--color-border-control)] px-4 text-sm">Back</Link>
          <Button type="submit" variant="primary" disabled={pending || audiences.length === 0}>{pending ? "Saving…" : campaign ? "Save draft" : "Create draft"}</Button>
        </div>
      </div>

      <aside aria-label="Message preview" className="space-y-3 xl:sticky xl:top-6 xl:self-start">
        <h2 className="text-base font-semibold">Preview</h2>
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4 text-sm">
          {channel === "email" ? (
            <>
              <p className="break-words"><span className="font-semibold">Subject:</span> {renderedSubject || "—"}</p>
              <div className="mt-3 whitespace-pre-wrap break-words">{renderedBody || "Your message appears here."}</div>
            </>
          ) : (
            <>
              <p className="whitespace-pre-wrap break-words">{renderedBody ? smsText : "Your SMS appears here."}</p>
              <p className="mt-3 text-xs text-[var(--color-text-secondary)]" aria-live="polite">
                {smsText.length} / {SMS_BODY_MAX} characters · {smsSegmentCount(smsText)} segment(s)
              </p>
            </>
          )}
        </div>
        <p className="text-xs text-[var(--color-text-secondary)]">Sample values are shown. Recipients are chosen when the campaign is approved.</p>
      </aside>
    </form>
  );
}
