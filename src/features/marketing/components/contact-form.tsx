"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactCreateSchema, contactUpdateSchema } from "@/features/marketing/schemas/marketing.schema";
import { createContactAction, updateContactAction } from "@/features/marketing/actions/contacts.action";
import { Button } from "@/shared/components/ui/button";
import { FormMessage } from "@/shared/components/ui/form-message";
import { TextField } from "@/shared/components/ui/text-field";
import { CONTACT_SOURCES, LIFECYCLE_STAGES } from "@/features/marketing/types/constants";
import { LIFECYCLE_LABELS, SOURCE_LABELS } from "@/features/marketing/labels";
import { selectClass } from "@/shared/components/ui/button";
import type { ContactDto } from "@/server/marketing/contact.service";

export type ContactFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  source: (typeof CONTACT_SOURCES)[number];
  lifecycleStage: (typeof LIFECYCLE_STAGES)[number];
  isActive: boolean;
  consent?: { email: boolean; sms: boolean };
};

const checkboxClass =
  "h-4 w-4 shrink-0 rounded-[calc(var(--radius-control)*0.5)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] accent-[var(--color-action-primary)] focus:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)]";

/**
 * Create and edit share one form. The same Zod schema validates here and in the server action.
 * Edit mode never sends consent; consent changes go through the consent panel, which writes history.
 */
export function ContactForm({
  mode,
  contact,
  onDone,
}: {
  mode: "create" | "edit";
  contact?: ContactDto;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const schema = mode === "create" ? contactCreateSchema : contactUpdateSchema;
  const defaultValues: ContactFormValues = {
    firstName: contact?.firstName ?? "",
    lastName: contact?.lastName ?? "",
    email: contact?.email ?? "",
    phone: contact?.phone ?? "",
    source: contact?.source ?? "manual",
    lifecycleStage: contact?.lifecycleStage ?? "lead",
    isActive: contact?.isActive ?? true,
    ...(mode === "create" ? { consent: { email: false, sms: false } } : {}),
  };
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<ContactFormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<ContactFormValues>,
    mode: "onBlur",
    defaultValues,
  });

  const submit = (values: ContactFormValues) =>
    startTransition(async () => {
      setFormError(null);
      const { consent, ...fields } = values;
      const result =
        mode === "create"
          ? await createContactAction({ ...fields, consent: consent ?? { email: false, sms: false } })
          : await updateContactAction(contact?.id, { ...fields, expectedVersion: contact?.version ?? 1 });
      if (!result.ok) {
        for (const [field, message] of Object.entries(result.error.details ?? {})) {
          if (field in defaultValues) setError(field as keyof ContactFormValues, { message });
        }
        setFormError(result.error.message);
        return;
      }
      if (mode === "create") {
        router.push(`/marketing/contacts/${result.data.id}`);
        router.refresh();
      } else {
        onDone?.();
        router.refresh();
      }
    });

  return (
    <form noValidate onSubmit={handleSubmit(submit)} className="grid gap-4 sm:grid-cols-2" aria-describedby={formError ? "contact-form-error" : undefined}>
      <TextField label="First name" autoComplete="given-name" error={errors.firstName?.message} {...register("firstName")} />
      <TextField label="Last name" autoComplete="family-name" error={errors.lastName?.message} {...register("lastName")} />
      <TextField label="Email" type="email" inputMode="email" autoComplete="off" error={errors.email?.message} {...register("email")} />
      <TextField label="Phone" type="tel" inputMode="tel" autoComplete="off" hint="Include the country code, for example +216 20 123 456" error={errors.phone?.message} {...register("phone")} />
      <div className="space-y-1.5">
        <label htmlFor="source" className="text-sm font-semibold">Source</label>
        <select id="source" className={selectClass} {...register("source")}>
          {CONTACT_SOURCES.map((source) => (
            <option key={source} value={source}>{SOURCE_LABELS[source]}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="lifecycleStage" className="text-sm font-semibold">Lifecycle stage</label>
        <select id="lifecycleStage" className={selectClass} {...register("lifecycleStage")}>
          {LIFECYCLE_STAGES.map((stage) => (
            <option key={stage} value={stage}>{LIFECYCLE_LABELS[stage]}</option>
          ))}
        </select>
      </div>
      <label className="inline-flex min-h-[44px] items-center gap-3 text-sm sm:col-span-2">
        <input type="checkbox" className={checkboxClass} {...register("isActive")} />
        Active (can receive campaigns)
      </label>
      {mode === "create" && (
        <fieldset className="space-y-2 sm:col-span-2">
          <legend className="text-sm font-semibold">Marketing consent given by this contact</legend>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Leave these unticked unless the contact has clearly agreed. Consent is recorded per channel with today&apos;s date and your account.
          </p>
          <label className="inline-flex min-h-[44px] items-center gap-3 text-sm">
            <input type="checkbox" className={checkboxClass} {...register("consent.email")} />
            Agreed to receive email marketing
          </label>
          <label className="inline-flex min-h-[44px] items-center gap-3 text-sm">
            <input type="checkbox" className={checkboxClass} {...register("consent.sms")} />
            Agreed to receive SMS marketing
          </label>
        </fieldset>
      )}
      {formError && (
        <div id="contact-form-error" className="sm:col-span-2">
          <FormMessage kind="error">{formError}</FormMessage>
        </div>
      )}
      <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
        {onDone && (
          <Button onClick={onDone} disabled={pending}>Cancel</Button>
        )}
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Saving…" : mode === "create" ? "Create contact" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
