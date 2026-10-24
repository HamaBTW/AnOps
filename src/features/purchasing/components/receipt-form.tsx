"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { receiptInputSchema } from "@/features/purchasing/schemas/purchasing.schema";
import { createReceiptAction } from "@/features/purchasing/actions/purchasing.action";
import { Button, selectClass } from "@/shared/components/ui/button";
import { FormMessage } from "@/shared/components/ui/form-message";
import { TextField } from "@/shared/components/ui/text-field";

type FormValues = z.input<typeof receiptInputSchema>;

export function ReceiptForm({
  orderId,
  lines,
  warehouses,
}: {
  orderId: string;
  lines: { id: string; sku: string; productName: string; unitOfMeasure: string; remaining: string }[];
  warehouses: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(receiptInputSchema),
    mode: "onBlur",
    defaultValues: {
      purchaseOrderId: orderId,
      warehouseId: "",
      lines: lines.map((line) => ({ purchaseOrderLineId: line.id, quantity: "0" })),
    },
  });

  const onSubmit = (values: FormValues) => {
    setMessage(null);
    startTransition(async () => {
      const result = await createReceiptAction(values);
      if (!result.ok) {
        setMessage(`${result.error.message} (ref ${result.error.requestId.slice(0, 8)})`);
        return;
      }
      router.push(`/purchasing/receipts/${result.data.id}`);
    });
  };

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <p className="text-sm text-[var(--color-text-secondary)]">
        Enter what physically arrived. A receipt is a draft until you post it; posting is what increases stock.
      </p>
      {message && <FormMessage kind="error">{message}</FormMessage>}
      <fieldset disabled={pending} className="grid gap-5 sm:grid-cols-2">
        <legend className="sr-only">Receipt</legend>
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="warehouseId" className="text-sm font-semibold">Receive into warehouse</label>
          <select id="warehouseId" className={selectClass} aria-invalid={Boolean(errors.warehouseId)} {...register("warehouseId")}>
            <option value="">Choose…</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.label}</option>
            ))}
          </select>
          {errors.warehouseId?.message && <p role="alert" className="text-xs text-[#c0392b]">{errors.warehouseId.message}</p>}
        </div>
        {lines.map((line, index) => (
          <div key={line.id} className="sm:col-span-2 grid gap-2 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] p-4 sm:grid-cols-[1fr_180px] sm:items-end">
            <div>
              <p className="font-medium">{line.sku}</p>
              <p className="text-sm text-[var(--color-text-secondary)]">{line.productName} · remaining {line.remaining} {line.unitOfMeasure}</p>
            </div>
            <TextField
              label="Received quantity"
              inputMode="decimal"
              error={errors.lines?.[index]?.quantity?.message}
              {...register(`lines.${index}.quantity`)}
            />
          </div>
        ))}
        <div className="flex justify-end sm:col-span-2">
          <Button type="submit" variant="primary" disabled={pending || warehouses.length === 0}>
            {pending ? "Saving…" : "Save receipt draft"}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
