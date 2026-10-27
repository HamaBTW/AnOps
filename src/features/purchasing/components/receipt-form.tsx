"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { receiptEntrySchema } from "@/features/purchasing/schemas/purchasing.schema";
import { createReceiptAction } from "@/features/purchasing/actions/purchasing.action";
import { Button, selectClass } from "@/shared/components/ui/button";
import { FormMessage } from "@/shared/components/ui/form-message";
import { TextField } from "@/shared/components/ui/text-field";
import { isCountableUnit, type UnitOfMeasure } from "@/shared/domain/units";

type FormValues = z.input<ReturnType<typeof receiptEntrySchema>>;

/** Keys that can produce a negative, exponent, or sign-prefixed value. Blocked so the field only takes plain digits. */
const BLOCKED_KEYS = new Set(["-", "+", "e", "E"]);

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
  // A number input reports text it cannot parse (for example a pasted "1e3") as an empty value. Such
  // input must never be read as "nothing received", so it is tracked here and blocks submission.
  const [inputErrors, setInputErrors] = useState<Record<number, string>>({});
  const schema = useMemo(
    () => receiptEntrySchema(lines.map((line) => ({ id: line.id, sku: line.sku, unitOfMeasure: line.unitOfMeasure, remaining: line.remaining }))),
    [lines]
  );
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: {
      purchaseOrderId: orderId,
      warehouseId: "",
      // Blank means "nothing received on this line". It is sent as 0 and never shown as a typed zero.
      lines: lines.map((line) => ({ purchaseOrderLineId: line.id, quantity: "" })),
    },
  });

  const onQuantityChange = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const invalid = event.target.validity.badInput;
    setInputErrors((previous) => {
      const next = { ...previous };
      if (invalid) next[index] = "Enter digits only, such as 4 or 2.5. The value was not accepted.";
      else delete next[index];
      return next;
    });
  };

  const onSubmit = (values: FormValues) => {
    setMessage(null);
    if (Object.keys(inputErrors).length > 0) return;
    const payload = {
      ...values,
      lines: values.lines.map((line) => ({ ...line, quantity: line.quantity.trim() === "" ? "0" : line.quantity.trim() })),
    };
    startTransition(async () => {
      const result = await createReceiptAction(payload);
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
      {(errors.lines as { message?: string } | undefined)?.message && (
        <FormMessage kind="error">{(errors.lines as { message?: string }).message}</FormMessage>
      )}
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
        {lines.map((line, index) => {
          const countable = isCountableUnit(line.unitOfMeasure as UnitOfMeasure);
          const quantityField = register(`lines.${index}.quantity`);
          return (
            <div key={line.id} className="sm:col-span-2 grid gap-2 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] p-4 sm:grid-cols-[1fr_180px] sm:items-end">
              <div>
                <p className="font-medium">{line.sku}</p>
                <p className="text-sm text-[var(--color-text-secondary)]">{line.productName} · remaining {line.remaining} {line.unitOfMeasure}</p>
              </div>
              <TextField
                label="Received quantity"
                type="number"
                inputMode="decimal"
                min={0}
                step={countable ? 1 : "0.000001"}
                placeholder="0"
                hint={`Up to ${line.remaining} ${line.unitOfMeasure}. Leave blank to receive nothing on this line.`}
                error={inputErrors[index] ?? errors.lines?.[index]?.quantity?.message}
                onFocus={(event) => event.currentTarget.select()}
                onKeyDown={(event) => {
                  if (BLOCKED_KEYS.has(event.key)) event.preventDefault();
                }}
                onWheel={(event) => event.currentTarget.blur()}
                {...quantityField}
                onChange={(event) => {
                  onQuantityChange(index, event);
                  return quantityField.onChange(event);
                }}
              />
            </div>
          );
        })}
        <div className="flex justify-end sm:col-span-2">
          <Button type="submit" variant="primary" disabled={pending || warehouses.length === 0}>
            {pending ? "Saving…" : "Save receipt draft"}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
