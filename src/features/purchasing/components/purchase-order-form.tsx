"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { purchaseOrderInputSchema, MAX_PURCHASE_ORDER_LINES } from "@/features/purchasing/schemas/purchasing.schema";
import { createPurchaseOrderAction, updatePurchaseOrderAction } from "@/features/purchasing/actions/purchasing.action";
import { Check, LoaderCircle, PackagePlus, Plus, StickyNote, Trash2, Truck } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Field, FormActions, FormSection, Select, Textarea } from "@/shared/components/ui/form-kit";
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
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {message && <FormMessage kind="error">{message}</FormMessage>}

      <fieldset disabled={pending} className="min-w-0 space-y-6">
        <legend className="sr-only">Purchase order</legend>
        <FormSection title="Order details" description="Who you are buying from and when you expect delivery." icon={Truck}>
          <Field label="Supplier" htmlFor="supplierId" required error={errors.supplierId?.message}>
            <Select id="supplierId" aria-invalid={Boolean(errors.supplierId)} {...register("supplierId")}>
              <option value="">Select a supplier…</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </Select>
          </Field>
          <TextField label="Expected delivery" type="date" hint="Optional. The date the supplier committed to." error={errors.expectedDate?.message} {...register("expectedDate")} />
        </FormSection>

        <FormSection
          title={`Order lines (${fields.length})`}
          description="Products, quantities and prices. Totals are calculated by the server when you save."
          icon={PackagePlus}
          columns={1}
          actions={
            <Button
              onClick={() => append({ productId: "", quantity: "", unitCost: "0.000", taxRate: "0" })}
              disabled={pending || fields.length >= MAX_PURCHASE_ORDER_LINES}
            >
              <Plus aria-hidden className="size-4" />
              Add line
            </Button>
          }
        >
          {errors.lines?.root?.message && <p role="alert" className="text-sm text-[var(--color-status-error)]">{errors.lines.root.message}</p>}
          <ul className="space-y-4">
            {fields.map((field, index) => (
              <li key={field.id} className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-canvas)] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Line {index + 1}</span>
                  <Button variant="ghost" onClick={() => remove(index)} disabled={pending || fields.length === 1} aria-label={`Remove line ${index + 1}`} className="min-h-[36px] px-2 text-[var(--color-status-error)]">
                    <Trash2 aria-hidden className="size-4" />
                    Remove
                  </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr]">
                  <Field label="Product" htmlFor={`lines-${index}-productId`} required error={errors.lines?.[index]?.productId?.message} className="sm:col-span-3 lg:col-span-1">
                    <Select id={`lines-${index}-productId`} aria-invalid={Boolean(errors.lines?.[index]?.productId)} {...register(`lines.${index}.productId`)}>
                      <option value="">Select a product…</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </Select>
                  </Field>
                  <TextField label="Quantity" required placeholder="e.g. 25" inputMode="decimal" error={errors.lines?.[index]?.quantity?.message} {...register(`lines.${index}.quantity`)} />
                  <TextField label={`Unit cost (${currencyCode})`} placeholder="0.000" inputMode="decimal" error={errors.lines?.[index]?.unitCost?.message} {...register(`lines.${index}.unitCost`)} />
                  <TextField label="Tax rate (%)" placeholder="e.g. 19" inputMode="decimal" error={errors.lines?.[index]?.taxRate?.message} {...register(`lines.${index}.taxRate`)} />
                </div>
              </li>
            ))}
          </ul>
        </FormSection>

        <FormSection title="Notes" description="Optional. Visible on the order for your team." icon={StickyNote} columns={1}>
          <Field label="Internal notes" htmlFor="notes" error={errors.notes?.message}>
            <Textarea id="notes" rows={3} maxLength={1000} placeholder="e.g. Deliver to dock 2, call the supplier before dispatch" {...register("notes")} />
          </Field>
        </FormSection>
      </fieldset>

      <FormActions>
        <Button onClick={() => router.back()} disabled={pending}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <Check aria-hidden className="size-4" />}
          {pending ? "Saving…" : isEdit ? "Save draft" : "Create draft order"}
        </Button>
      </FormActions>
    </form>
  );
}
