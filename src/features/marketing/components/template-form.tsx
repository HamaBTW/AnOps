"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { templateInputSchema, type TemplateInput } from "@/features/marketing/schemas/marketing.schema";
import { createTemplateAction, updateTemplateAction } from "@/features/marketing/actions/templates.action";
import { Button, selectClass } from "@/shared/components/ui/button";
import { FormMessage } from "@/shared/components/ui/form-message";
import { TextField } from "@/shared/components/ui/text-field";
import { CHANNEL_LABELS } from "@/features/marketing/labels";
import { MARKETING_CHANNELS, type MarketingChannel } from "@/features/marketing/types/constants";
import { renderTemplate, smsSegmentCount, SMS_BODY_MAX, SMS_OPT_OUT_FOOTER, TEMPLATE_VARIABLES, type TemplateVariable } from "@/features/marketing/utils/template";
import type { TemplateDto } from "@/server/marketing/template.service";

const SAMPLE: Record<TemplateVariable, string> = {
  first_name: "Amina",
  last_name: "Ben Ali",
  email: "amina@example.test",
  company_name: "Your company",
  unsubscribe_url: "#unsubscribe",
};

/**
 * Template editor with a live preview rendered from sample values. The preview is a convenience only:
 * the server validates the same allowlist and length rules before saving.
 */
export function TemplateForm({ template, canManage }: { template?: TemplateDto; canManage: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<TemplateInput>({
    resolver: zodResolver(templateInputSchema),
    mode: "onBlur",
    defaultValues: template
      ? { name: template.name, channel: template.channel, subject: template.subject, body: template.body, isActive: template.isActive }
      : { name: "", channel: "email", subject: "", body: "", isActive: true },
  });
  const channel = watch("channel") as MarketingChannel;
  const subject = watch("subject") ?? "";
  const body = watch("body") ?? "";

  const rendered = useMemo(() => renderTemplate(body, SAMPLE), [body]);
  const renderedSubject = useMemo(() => renderTemplate(subject, SAMPLE), [subject]);
  const smsText = `${rendered} ${SMS_OPT_OUT_FOOTER}`;
  const smsLength = smsText.length;

  const insert = (token: TemplateVariable) => {
    const field = getValues("body") ?? "";
    setValue("body", `${field}{{${token}}}`, { shouldDirty: true, shouldValidate: true });
  };

  const submit = (values: TemplateInput) =>
    startTransition(async () => {
      setNotice(null);
      const payload = { ...values, subject: values.channel === "email" ? values.subject : "" };
      const result = template
        ? await updateTemplateAction(template.id, { ...payload, expectedVersion: template.version })
        : await createTemplateAction(payload);
      if (!result.ok) return setNotice({ kind: "error", text: result.error.message });
      if (template) {
        setNotice({ kind: "success", text: "Template saved. Campaigns that already copied it keep their own text." });
        router.refresh();
      } else {
        router.push(`/marketing/templates/${result.data.id}`);
        router.refresh();
      }
    });

  return (
    <form noValidate onSubmit={handleSubmit(submit)} className="grid gap-6 xl:grid-cols-2">
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Template name" disabled={!canManage} error={errors.name?.message} {...register("name")} />
          <div className="space-y-1.5">
            <label htmlFor="channel" className="text-sm font-semibold">Channel</label>
            <select id="channel" className={selectClass} disabled={!canManage || Boolean(template)} {...register("channel")}>
              {MARKETING_CHANNELS.map((item) => <option key={item} value={item}>{CHANNEL_LABELS[item]}</option>)}
            </select>
            {template && <p className="text-xs text-[var(--color-text-secondary)]">The channel is fixed once a template exists.</p>}
          </div>
        </div>

        {channel === "email" && (
          <TextField label="Subject" maxLength={150} disabled={!canManage} error={errors.subject?.message} {...register("subject")} />
        )}

        <div className="space-y-1.5">
          <label htmlFor="body" className="text-sm font-semibold">{channel === "email" ? "Message (plain text)" : "SMS message"}</label>
          <textarea
            id="body"
            rows={channel === "email" ? 10 : 5}
            disabled={!canManage}
            aria-invalid={Boolean(errors.body)}
            aria-describedby="body-help"
            className="w-full rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] p-3 text-sm focus:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)]"
            {...register("body")}
          />
          <p id="body-help" className="text-xs text-[var(--color-text-secondary)]">
            {channel === "email"
              ? "Plain text only. Line breaks are kept. An unsubscribe link is added automatically."
              : `Up to ${SMS_BODY_MAX - SMS_OPT_OUT_FOOTER.length - 1} characters. "${SMS_OPT_OUT_FOOTER}" is added automatically.`}
          </p>
          {errors.body?.message && <p role="alert" className="text-xs text-[#c0392b]">{errors.body.message}</p>}
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">Insert a variable</legend>
          <div className="flex flex-wrap gap-2">
            {TEMPLATE_VARIABLES.filter((name) => name !== "unsubscribe_url" || channel === "email").map((name) => (
              <button
                key={name}
                type="button"
                disabled={!canManage}
                onClick={() => insert(name)}
                className="min-h-[44px] rounded-[var(--radius-pill)] border border-[var(--color-border-control)] px-3 text-sm hover:bg-[var(--color-bg-subtle)] disabled:opacity-60"
              >
                {`{{${name}}}`}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="inline-flex min-h-[44px] items-center gap-3 text-sm">
          <input type="checkbox" disabled={!canManage} className="h-4 w-4 accent-[var(--color-action-primary)]" {...register("isActive")} />
          Available for new campaigns
        </label>

        {notice && <FormMessage kind={notice.kind}>{notice.text}</FormMessage>}
        {canManage && (
          <div className="flex justify-end gap-2">
            <Link href="/marketing/templates" className="inline-flex min-h-[44px] items-center rounded-[var(--radius-control)] border border-[var(--color-border-control)] px-4 text-sm">Back</Link>
            <Button type="submit" variant="primary" disabled={pending}>{pending ? "Saving…" : template ? "Save template" : "Create template"}</Button>
          </div>
        )}
      </div>

      <aside aria-label="Preview" className="space-y-3 xl:sticky xl:top-6 xl:self-start">
        <h2 className="text-base font-semibold">Preview</h2>
        <p className="text-xs text-[var(--color-text-secondary)]">Shown with sample values. Real messages use each contact&apos;s details.</p>
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4">
          {channel === "email" ? (
            <>
              <p className="break-words text-sm"><span className="font-semibold">Subject:</span> {renderedSubject || "—"}</p>
              <div className="mt-3 whitespace-pre-wrap break-words text-sm">{rendered || "Your message appears here."}{"\n\n"}Unsubscribe: https://…</div>
            </>
          ) : (
            <>
              <p className="whitespace-pre-wrap break-words text-sm">{smsText.trim() === SMS_OPT_OUT_FOOTER ? "Your SMS appears here." : smsText}</p>
              <p className={`mt-3 text-xs ${smsLength > SMS_BODY_MAX ? "text-[#c0392b]" : "text-[var(--color-text-secondary)]"}`} aria-live="polite">
                {smsLength} / {SMS_BODY_MAX} characters · {smsSegmentCount(smsText)} segment(s). Longer messages are charged per segment by the carrier.
              </p>
            </>
          )}
        </div>
        <p className="text-xs text-[var(--color-text-secondary)]">
          Allowed variables: {TEMPLATE_VARIABLES.map((name) => `{{${name}}}`).join(", ")}. Any other {"{{…}}"} is rejected on save.
        </p>
      </aside>
    </form>
  );
}
