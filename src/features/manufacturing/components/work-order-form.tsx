"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { workOrderInputSchema } from "@/features/manufacturing/schemas/manufacturing.schema";
import { createWorkOrderAction } from "@/features/manufacturing/actions/manufacturing.action";
import { Button, selectClass } from "@/shared/components/ui/button";
import { FormMessage } from "@/shared/components/ui/form-message";
import { TextField } from "@/shared/components/ui/text-field";

type FormValues = z.input<typeof workOrderInputSchema>;

export function WorkOrderForm({
  boms,
  warehouses,
}: {
  boms: { id: string; label: string }[];
  warehouses: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(workOrderInputSchema),
    mode: "onBlur",
    defaultValues: { bomId: "", warehouseId: "", quantity: "", plannedStart: "" },
  });

  const onSubmit = (values: FormValues) => {
    setMessage(null);
    startTransition(async () => {
      const result = await createWorkOrderAction(values);
      if (!result.ok) {
        setMessage(`${result.error.message} (ref ${result.error.requestId.slice(0, 8)})`);
        return;
      }
      router.push(`/manufacturing/work-orders/${result.data.id}`);
    });
  };

  const noBoms = boms.length === 0;

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {message && <FormMessage kind="error">{message}</FormMessage>}
      <p className="text-sm text-[var(--color-text-secondary)]">
        Creating a work order does not consume stock. Components are used when the order is completed.
      </p>
      <fieldset disabled={pending || noBoms} className="grid gap-5 sm:grid-cols-2">
        <legend className="sr-only">Work order</legend>
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="bomId" className="text-sm font-semibold">Bill of materials (active revision)</label>
          <select id="bomId" className={selectClass} aria-invalid={Boolean(errors.bomId)} {...register("bomId")}>
            <option value="">Choose…</option>
            {boms.map((b) => (
              <option key={b.id} value={b.id}>{b.label}</option>
            ))}
          </select>
          {errors.bomId?.message && <p role="alert" className="text-xs text-[#c0392b]">{errors.bomId.message}</p>}
        </div>
        <TextField label="Quantity to produce" inputMode="decimal" error={errors.quantity?.message} {...register("quantity")} />
        <div className="space-y-1.5">
          <label htmlFor="warehouseId" className="text-sm font-semibold">Warehouse for components and output</label>
          <select id="warehouseId" className={selectClass} aria-invalid={Boolean(errors.warehouseId)} {...register("warehouseId")}>
            <option value="">Choose…</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.label}</option>
            ))}
          </select>
          {errors.warehouseId?.message && <p role="alert" className="text-xs text-[#c0392b]">{errors.warehouseId.message}</p>}
        </div>
        <TextField label="Planned start (optional)" type="date" error={errors.plannedStart?.message} {...register("plannedStart")} />
        <div className="flex justify-end sm:col-span-2">
          <Button type="submit" variant="primary">{pending ? "Creating…" : "Create work order"}</Button>
        </div>
      </fieldset>
      {noBoms && <p className="text-sm text-[var(--color-text-secondary)]">No active bills of materials. Activate a BOM revision first.</p>}
    </form>
  );
}
