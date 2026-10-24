"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { bomInputSchema, MAX_BOM_COMPONENTS } from "@/features/manufacturing/schemas/manufacturing.schema";
import { createBomAction, updateBomAction } from "@/features/manufacturing/actions/manufacturing.action";
import { Button, selectClass, textareaClass } from "@/shared/components/ui/button";
import { FormMessage } from "@/shared/components/ui/form-message";
import { TextField } from "@/shared/components/ui/text-field";

type FormValues = z.input<typeof bomInputSchema>;
type Option = { id: string; label: string };

export function BomForm({
  products,
  initial,
  bomId,
  version,
}: {
  products: Option[];
  initial?: FormValues;
  bomId?: string;
  version?: number;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { register, control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(bomInputSchema),
    mode: "onBlur",
    defaultValues: initial ?? {
      finishedProductId: "",
      notes: "",
      components: [{ productId: "", quantityPerUnit: "" }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "components" });

  const onSubmit = (values: FormValues) => {
    setMessage(null);
    startTransition(async () => {
      const result = bomId
        ? await updateBomAction(bomId, { ...values, expectedVersion: version })
        : await createBomAction(values);
      if (!result.ok) {
        setMessage(`${result.error.message} (ref ${result.error.requestId.slice(0, 8)})`);
        return;
      }
      router.push(`/manufacturing/boms/${result.data.id}`);
    });
  };

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {message && <FormMessage kind="error">{message}</FormMessage>}
      <fieldset disabled={pending} className="grid gap-5 sm:grid-cols-2">
        <legend className="sr-only">Bill of materials</legend>
        <div className="space-y-1.5">
          <label htmlFor="finishedProductId" className="text-sm font-semibold">Finished product</label>
          <select id="finishedProductId" className={selectClass} aria-invalid={Boolean(errors.finishedProductId)} {...register("finishedProductId")}>
            <option value="">Choose…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
          {errors.finishedProductId?.message && <p role="alert" className="text-xs text-[#c0392b]">{errors.finishedProductId.message}</p>}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="notes" className="text-sm font-semibold">Notes</label>
          <textarea id="notes" rows={2} className={textareaClass} {...register("notes")} />
        </div>
      </fieldset>

      <section aria-labelledby="components-heading" className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 id="components-heading" className="text-base font-semibold">Components per unit ({fields.length})</h2>
          <Button onClick={() => append({ productId: "", quantityPerUnit: "" })} disabled={pending || fields.length >= MAX_BOM_COMPONENTS}>Add component</Button>
        </div>
        {errors.components?.root?.message && <p role="alert" className="text-sm text-[#c0392b]">{errors.components.root.message}</p>}
        <ul className="space-y-4">
          {fields.map((field, index) => (
            <li key={field.id} className="grid gap-3 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
              <div className="space-y-1.5">
                <label htmlFor={`components-${index}-productId`} className="text-sm font-semibold">Component</label>
                <select id={`components-${index}-productId`} className={selectClass} aria-invalid={Boolean(errors.components?.[index]?.productId)} {...register(`components.${index}.productId`)}>
                  <option value="">Choose…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
                {errors.components?.[index]?.productId?.message && <p role="alert" className="text-xs text-[#c0392b]">{errors.components[index].productId?.message}</p>}
              </div>
              <TextField label="Quantity per unit" inputMode="decimal" error={errors.components?.[index]?.quantityPerUnit?.message} {...register(`components.${index}.quantityPerUnit`)} />
              <Button variant="ghost" onClick={() => remove(index)} disabled={pending || fields.length === 1} aria-label={`Remove component ${index + 1}`}>Remove</Button>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-col-reverse gap-3 border-t border-[var(--color-border-subtle)] pt-5 sm:flex-row sm:justify-end">
        <Button onClick={() => router.back()} disabled={pending}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={pending}>{pending ? "Saving…" : bomId ? "Save draft" : "Create draft BOM"}</Button>
      </div>
    </form>
  );
}
