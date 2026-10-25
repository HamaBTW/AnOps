"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supplierInputSchema } from "@/features/purchasing/schemas/purchasing.schema";
import { createSupplierAction, updateSupplierAction } from "@/features/purchasing/actions/purchasing.action";
import { Button } from "@/shared/components/ui/button";
import { FormMessage } from "@/shared/components/ui/form-message";
import { TextField } from "@/shared/components/ui/text-field";
import { StatusBadge } from "@/shared/components/data-display/status-badge";
import type { SupplierDto } from "@/features/purchasing/types";

type SupplierFormValues = z.input<typeof supplierInputSchema>;

function SupplierForm({
  defaultValues,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  defaultValues: SupplierFormValues;
  submitLabel: string;
  onSubmit: (values: SupplierFormValues) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierInputSchema),
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
      <TextField label="Supplier name" error={errors.name?.message} {...register("name")} />
      <TextField label="Email" type="email" autoComplete="off" error={errors.email?.message} {...register("email")} />
      <TextField label="Phone" error={errors.phone?.message} {...register("phone")} />
      <TextField label="Tax identifier" error={errors.taxIdentifier?.message} {...register("taxIdentifier")} />
      <label className="inline-flex min-h-[44px] items-center gap-3 text-sm sm:col-span-2">
        <input
          type="checkbox"
          className="h-4 w-4 shrink-0 rounded-[calc(var(--radius-control)*0.5)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] accent-[var(--color-action-primary)] focus:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-[2px] focus-visible:ring-offset-[var(--color-bg-surface)]"
          {...register("isActive")}
        />
        Active (can receive new orders)
      </label>
      {formError && <div className="sm:col-span-2"><FormMessage kind="error">{formError}</FormMessage></div>}
      <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
        <Button onClick={onCancel} disabled={pending}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={pending}>{pending ? "Saving…" : submitLabel}</Button>
      </div>
    </form>
  );
}

export function SupplierManager({ suppliers, canManage }: { suppliers: SupplierDto[]; canManage: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"none" | "create" | string>("none");

  return (
    <div className="space-y-6">
      {canManage && mode === "none" && <Button variant="primary" onClick={() => setMode("create")}>New supplier</Button>}
      {canManage && mode === "create" && (
        <section aria-labelledby="new-supplier" className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5">
          <h2 id="new-supplier" className="mb-4 text-base font-semibold">New supplier</h2>
          <SupplierForm
            defaultValues={{ name: "", email: "", phone: "", taxIdentifier: "", address: "", isActive: true }}
            submitLabel="Create supplier"
            onCancel={() => setMode("none")}
            onSubmit={async (values) => {
              const result = await createSupplierAction(values);
              if (!result.ok) return result.error.message;
              setMode("none");
              router.refresh();
              return null;
            }}
          />
        </section>
      )}

      {suppliers.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-border-control)] p-6 text-sm text-[var(--color-text-secondary)]">
          No suppliers yet. Add a supplier before creating purchase orders.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--color-border-subtle)] rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
          {suppliers.map((supplier) => (
            <li key={supplier.id} className="p-4">
              {mode === supplier.id ? (
                <SupplierForm
                  defaultValues={{ name: supplier.name, email: supplier.email, phone: supplier.phone, taxIdentifier: supplier.taxIdentifier, address: supplier.address, isActive: supplier.isActive }}
                  submitLabel="Save supplier"
                  onCancel={() => setMode("none")}
                  onSubmit={async (values) => {
                    const result = await updateSupplierAction(supplier.id, values);
                    if (!result.ok) return result.error.message;
                    setMode("none");
                    router.refresh();
                    return null;
                  }}
                />
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      {supplier.name}
                      {!supplier.isActive && <StatusBadge label="Inactive" tone="neutral" />}
                    </p>
                    <p className="break-words text-sm text-[var(--color-text-secondary)]">
                      {[supplier.email, supplier.phone, supplier.taxIdentifier].filter(Boolean).join(" · ") || "No contact details"}
                    </p>
                  </div>
                  {canManage && <Button onClick={() => setMode(supplier.id)}>Edit</Button>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
