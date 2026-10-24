"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { purchaseOrderInputSchema, MAX_PURCHASE_ORDER_LINES } from "@/features/purchasing/schemas/purchasing.schema";
import { createPurchaseOrderAction, updatePurchaseOrderAction } from "@/features/purchasing/actions/purchasing.action";
import { Button, selectClass, textareaClass } from "@/shared/components/ui/button";
import { FormMessage } from "@/shared/components/ui/form-message";
import { TextField } from "@/shared/components/ui/text-field";

type FormValues = z.input<typeof purchaseOrderInputSchema>;

type Option = { id: string; label: string };

export function PurchaseOrderForm({
  suppliers,
  products,
  initial,
  orderId,
  version,
  currencyCode,
}: {
  suppliers: Option[];
  products: Option[];
  initial?: FormValues;
  orderId?: string;
  version?: number;
  currencyCode: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(orderId);

  const { register, control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(purchaseOrderInputSchema),
    mode: "onBlur",
    defaultValues: initial ?? {
      supplierId: "",
      expectedDate: "",
      notes: "",
      lines: [{ productId: "", quantity: "", unitCost: "0.000", taxRate: "0" }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });

  const onSubmit = (values: FormValues) => {
    setMessage(null);
    startTransition(async () => {
      const result = isEdit && orderId
        ? await updatePurchaseOrderAction(orderId, { ...values, expectedVersion: version })
        : await createPurchaseOrderAction(values);
      if (!result.ok) {
        setMessage(`${result.error.message} (ref ${result.error.requestId.slice(0, 8)})`);
        return;
      }
      router.push(`/purchasing/orders/${result.data.id}`);
    });
  };

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {message && <FormMessage kind="error">{message}</FormMessage>}

      <fieldset disabled={pending} className="grid gap-5 sm:grid-cols-2">
        <legend className="sr-only">Order header</legend>
        <div className="space-y-1.5">
          <label htmlFor="supplierId" className="text-sm font-semibold">Supplier</label>
          <select id="supplierId" className={selectClass} aria-invalid={Boolean(errors.supplierId)} {...register("supplierId")}>
            <option value="">Choose a supplier…</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
          {errors.supplierId?.message && <p role="alert" className="text-xs text-[#c0392b]">{errors.supplierId.message}</p>}
        </div>
        <TextField label="Expected delivery" type="date" error={errors.expectedDate?.message} {...register("expectedDate")} />
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="notes" className="text-sm font-semibold">Notes</label>
          <textarea id="notes" rows={2} className={textareaClass} {...register("notes")} />
          {errors.notes?.message && <p role="alert" className="text-xs text-[#c0392b]">{errors.notes.message}</p>}
        </div>
      </fieldset>

      <section aria-labelledby="lines-heading" className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 id="lines-heading" className="text-base font-semibold">Lines ({fields.length})</h2>
          <Button
            onClick={() => append({ productId: "", quantity: "", unitCost: "0.000", taxRate: "0" })}
            disabled={pending || fields.length >= MAX_PURCHASE_ORDER_LINES}
          >
            Add line
          </Button>
        </div>
        {errors.lines?.root?.message && <p role="alert" className="text-sm text-[#c0392b]">{errors.lines.root.message}</p>}

        <ul className="space-y-4">
          {fields.map((field, index) => (
            <li key={field.id} className="grid gap-3 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] sm:items-end">
              <div className="space-y-1.5">
                <label htmlFor={`lines-${index}-productId`} className="text-sm font-semibold">Product</label>
                <select id={`lines-${index}-productId`} className={selectClass} aria-invalid={Boolean(errors.lines?.[index]?.productId)} {...register(`lines.${index}.productId`)}>
                  <option value="">Choose…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
                {errors.lines?.[index]?.productId?.message && <p role="alert" className="text-xs text-[#c0392b]">{errors.lines[index].productId?.message}</p>}
              </div>
              <TextField label="Quantity" inputMode="decimal" error={errors.lines?.[index]?.quantity?.message} {...register(`lines.${index}.quantity`)} />
              <TextField label={`Unit cost (${currencyCode})`} inputMode="decimal" error={errors.lines?.[index]?.unitCost?.message} {...register(`lines.${index}.unitCost`)} />
              <TextField label="Tax %" inputMode="decimal" error={errors.lines?.[index]?.taxRate?.message} {...register(`lines.${index}.taxRate`)} />
              <Button variant="ghost" onClick={() => remove(index)} disabled={pending || fields.length === 1} aria-label={`Remove line ${index + 1}`}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
        <p className="text-sm text-[var(--color-text-secondary)]">Totals are calculated by the server when you save, using the values above.</p>
      </section>

      <div className="flex flex-col-reverse gap-3 border-t border-[var(--color-border-subtle)] pt-5 sm:flex-row sm:justify-end">
        <Button onClick={() => router.back()} disabled={pending}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={pending}>{pending ? "Saving…" : isEdit ? "Save draft" : "Create draft order"}</Button>
      </div>
    </form>
  );
}
