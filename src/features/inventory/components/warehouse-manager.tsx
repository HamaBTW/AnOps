"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { warehouseInputSchema } from "@/features/inventory/schemas/inventory.schema";
import { createWarehouseAction, updateWarehouseAction } from "@/features/inventory/actions/inventory.action";
import { Button } from "@/shared/components/ui/button";
import { FormMessage } from "@/shared/components/ui/form-message";
import { TextField } from "@/shared/components/ui/text-field";
import { StatusBadge } from "@/shared/components/data-display/status-badge";
import { formatDecimalString } from "@/shared/lib/format";
import type { WarehouseDto } from "@/features/inventory/types";

type WarehouseFormValues = z.input<typeof warehouseInputSchema>;

function WarehouseForm({
  defaultValues,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  defaultValues: WarehouseFormValues;
  submitLabel: string;
  onSubmit: (values: WarehouseFormValues) => Promise<string | null>;
  onCancel?: () => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<WarehouseFormValues>({
    resolver: zodResolver(warehouseInputSchema),
    mode: "onBlur",
    defaultValues,
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) =>
        startTransition(async () => {
          setFormError(null);
          const error = await onSubmit(values);
          if (error) setFormError(error);
        })
      )}
      className="grid gap-4 sm:grid-cols-2"
    >
      <TextField label="Name" error={errors.name?.message} {...register("name")} />
      <TextField label="Code" hint="2 to 12 letters, digits or dashes. Unique per company." error={errors.code?.message} {...register("code")} />
      <div className="sm:col-span-2">
        <TextField label="Address" error={errors.address?.message} {...register("address")} />
      </div>
      <label className="inline-flex min-h-[44px] items-center gap-3 text-sm sm:col-span-2">
        <input type="checkbox" className="h-5 w-5 accent-[var(--color-action-primary)]" {...register("isActive")} />
        Active (accepts stock and receipts)
      </label>
      {formError && <div className="sm:col-span-2"><FormMessage kind="error">{formError}</FormMessage></div>}
      <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
        {onCancel && <Button onClick={onCancel} disabled={pending}>Cancel</Button>}
        <Button type="submit" variant="primary" disabled={pending}>{pending ? "Saving…" : submitLabel}</Button>
      </div>
    </form>
  );
}

export function WarehouseManager({ warehouses, canManage }: { warehouses: WarehouseDto[]; canManage: boolean }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-6">
      {canManage && !creating && (
        <Button variant="primary" onClick={() => setCreating(true)}>New warehouse</Button>
      )}
      {canManage && creating && (
        <section aria-labelledby="new-warehouse" className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5">
          <h2 id="new-warehouse" className="mb-4 text-base font-semibold">New warehouse</h2>
          <WarehouseForm
            defaultValues={{ name: "", code: "", address: "", isActive: true }}
            submitLabel="Create warehouse"
            onCancel={() => setCreating(false)}
            onSubmit={async (values) => {
              const result = await createWarehouseAction(values);
              if (!result.ok) return result.error.message;
              setCreating(false);
              router.refresh();
              return null;
            }}
          />
        </section>
      )}

      {warehouses.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-border-control)] p-6 text-sm text-[var(--color-text-secondary)]">
          No warehouses yet. Stock is held in warehouses, so create one before receiving goods.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--color-border-subtle)] rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
          {warehouses.map((warehouse) => (
            <li key={warehouse.id} className="p-4">
              {editingId === warehouse.id ? (
                <WarehouseForm
                  defaultValues={{ name: warehouse.name, code: warehouse.code, address: warehouse.address, isActive: warehouse.isActive }}
                  submitLabel="Save warehouse"
                  onCancel={() => setEditingId(null)}
                  onSubmit={async (values) => {
                    const result = await updateWarehouseAction(warehouse.id, values);
                    if (!result.ok) return result.error.message;
                    setEditingId(null);
                    router.refresh();
                    return null;
                  }}
                />
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-medium text-[var(--color-text-primary)]">
                      {warehouse.code} · {warehouse.name}
                      {!warehouse.isActive && <StatusBadge label="Inactive" tone="neutral" />}
                    </p>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      {warehouse.address || "No address"} · On hand: {formatDecimalString(warehouse.onHand)}
                    </p>
                  </div>
                  {canManage && <Button onClick={() => setEditingId(warehouse.id)}>Edit</Button>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
