"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { categoryInputSchema } from "@/features/inventory/schemas/inventory.schema";
import { createCategoryAction, setCategoryActiveAction, updateCategoryAction } from "@/features/inventory/actions/inventory.action";
import { Button, textareaClass } from "@/shared/components/ui/button";
import { FormMessage } from "@/shared/components/ui/form-message";
import { TextField } from "@/shared/components/ui/text-field";
import { StatusBadge } from "@/shared/components/data-display/status-badge";
import type { CategoryDto } from "@/features/inventory/types";

type CategoryFormValues = z.input<typeof categoryInputSchema>;

function CategoryForm({
  defaultValues,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  defaultValues: CategoryFormValues;
  submitLabel: string;
  onSubmit: (values: CategoryFormValues) => Promise<string | null>;
  onCancel?: () => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, setError, formState: { errors } } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryInputSchema),
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
          if (error) {
            setFormError(error);
            if (error.includes("name")) setError("name", { message: error });
          }
        })
      )}
      className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-start"
    >
      <TextField label="Name" error={errors.name?.message} {...register("name")} />
      <div className="space-y-1.5">
        <label htmlFor="category-description" className="text-sm font-semibold text-[var(--color-text-primary)]">Description</label>
        <textarea id="category-description" rows={1} className={textareaClass} {...register("description")} />
      </div>
      <div className="flex gap-2 sm:pt-7">
        <Button type="submit" variant="primary" disabled={pending}>{pending ? "Saving…" : submitLabel}</Button>
        {onCancel && <Button onClick={onCancel} disabled={pending}>Cancel</Button>}
      </div>
      {formError && <div className="sm:col-span-3"><FormMessage kind="error">{formError}</FormMessage></div>}
    </form>
  );
}

export function CategoryManager({ categories, canManage }: { categories: CategoryDto[]; canManage: boolean }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = () => router.refresh();

  return (
    <div className="space-y-6">
      {canManage && (
        <section aria-labelledby="new-category" className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5">
          <h2 id="new-category" className="mb-4 text-base font-semibold">New category</h2>
          <CategoryForm
            defaultValues={{ name: "", description: "" }}
            submitLabel="Add category"
            onSubmit={async (values) => {
              const result = await createCategoryAction(values);
              if (!result.ok) return result.error.message;
              setNotice("Category added.");
              refresh();
              return null;
            }}
          />
        </section>
      )}

      {notice && <FormMessage kind="success">{notice}</FormMessage>}

      {categories.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-border-control)] p-6 text-sm text-[var(--color-text-secondary)]">
          No categories yet. Categories group products for reporting and filtering. They are optional.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--color-border-subtle)] rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
          {categories.map((category) => (
            <li key={category.id} className="p-4">
              {editingId === category.id ? (
                <CategoryForm
                  defaultValues={{ name: category.name, description: category.description }}
                  submitLabel="Save"
                  onCancel={() => setEditingId(null)}
                  onSubmit={async (values) => {
                    const result = await updateCategoryAction(category.id, values);
                    if (!result.ok) return result.error.message;
                    setEditingId(null);
                    refresh();
                    return null;
                  }}
                />
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-medium text-[var(--color-text-primary)]">
                      {category.name}
                      {!category.isActive && <StatusBadge label="Archived" tone="neutral" />}
                    </p>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      {category.description || "No description"} · {category.productCount} active product{category.productCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  {canManage && (
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => setEditingId(category.id)}>Edit</Button>
                      <Button
                        onClick={async () => {
                          const result = await setCategoryActiveAction(category.id, !category.isActive);
                          if (!result.ok) return setNotice(result.error.message);
                          refresh();
                        }}
                      >
                        {category.isActive ? "Archive" : "Restore"}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
