"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { workOrderInputSchema } from "@/features/manufacturing/schemas/manufacturing.schema";
import { createWorkOrderAction } from "@/features/manufacturing/actions/manufacturing.action";
import { Check, Factory, LoaderCircle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Field, FormActions, FormSection, Select } from "@/shared/components/ui/form-kit";
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
      <fieldset disabled={pending || noBoms} className="min-w-0">
        <legend className="sr-only">Work order</legend>
        <FormSection title="Production run" description="What to produce, how much and where." icon={Factory}>
          <Field label="Bill of materials (active revision)" htmlFor="bomId" required error={errors.bomId?.message} className="sm:col-span-2">
            <Select id="bomId" aria-invalid={Boolean(errors.bomId)} {...register("bomId")}>
              <option value="">Select a bill of materials…</option>
              {boms.map((b) => (
                <option key={b.id} value={b.id}>{b.label}</option>
              ))}
            </Select>
          </Field>
          <TextField label="Quantity to produce" required placeholder="e.g. 100" inputMode="decimal" error={errors.quantity?.message} {...register("quantity")} />
          <Field label="Warehouse for components and output" htmlFor="warehouseId" required error={errors.warehouseId?.message}>
            <Select id="warehouseId" aria-invalid={Boolean(errors.warehouseId)} {...register("warehouseId")}>
              <option value="">Select a warehouse…</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.label}</option>
              ))}
            </Select>
          </Field>
          <TextField label="Planned start" type="date" hint="Optional." error={errors.plannedStart?.message} {...register("plannedStart")} />
        </FormSection>
        <div className="mt-6">
          <FormActions>
            <Button onClick={() => router.back()} disabled={pending}>Cancel</Button>
            <Button type="submit" variant="primary">
              {pending ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <Check aria-hidden className="size-4" />}
              {pending ? "Creating…" : "Create work order"}
            </Button>
          </FormActions>
        </div>
      </fieldset>
      {noBoms && <p className="text-sm text-[var(--color-text-secondary)]">No active bills of materials. Activate a BOM revision first.</p>}
    </form>
  );
}
