"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { productInputSchema } from "@/features/inventory/schemas/inventory.schema";
import { createProductAction, updateProductAction } from "@/features/inventory/actions/inventory.action";
import { UNIT_LABELS, UNITS_OF_MEASURE } from "@/shared/domain/units";
import { Button, selectClass, textareaClass } from "@/shared/components/ui/button";
import { FormMessage } from "@/shared/components/ui/form-message";
import { TextField } from "@/shared/components/ui/text-field";
import type { ProductDto } from "@/features/inventory/types";

type CategoryOption = { id: string; name: string };

/** Form state uses the input shape; the submit handler receives the parsed output. */
type ProductFormValues = z.input<typeof productInputSchema>;
type ProductSubmitValues = z.output<typeof productInputSchema>;

const FORM_FIELDS = ["sku", "name", "description", "categoryId", "unitOfMeasure", "cost", "salePrice", "reorderPoint"];

export function ProductForm({
  mode,
  categories,
  product,
  canManage,
}: {
  mode: "create" | "edit";
  categories: CategoryOption[];
  product?: ProductDto;
  canManage: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ProductFormValues, unknown, ProductSubmitValues>({
    resolver: zodResolver(productInputSchema),
    mode: "onBlur",
    defaultValues: product
      ? {
          sku: product.sku,
          name: product.name,
          description: product.description,
          categoryId: product.categoryId ?? "",
          unitOfMeasure: product.unitOfMeasure,
          isStorable: product.isStorable,
          isActive: product.isActive,
          cost: product.cost,
          salePrice: product.salePrice,
          reorderPoint: product.reorderPoint,
        }
      : {
          sku: "",
          name: "",
          description: "",
          categoryId: "",
          unitOfMeasure: "unit",
          isStorable: true,
          isActive: true,
          cost: "0.000",
          salePrice: "0.000",
          reorderPoint: "0",
        },
  });

  const onSubmit = (values: ProductSubmitValues) => {
    setMessage(null);
    // Re-send the form as its input shape; the server parses it again with the same schema.
    const payload = { ...values, categoryId: values.categoryId ?? "" };
    startTransition(async () => {
      const result =
        mode === "edit" && product
          ? await updateProductAction(product.id, { ...payload, expectedVersion: product.version })
          : await createProductAction(payload);
      if (!result.ok) {
        for (const [field, text] of Object.entries(result.error.details ?? {})) {
          if (FORM_FIELDS.includes(field)) {
            setError(field as keyof ProductFormValues, { message: text });
          }
        }
        setMessage({ kind: "error", text: `${result.error.message} (ref ${result.error.requestId.slice(0, 8)})` });
        return;
      }
      if (mode === "create") {
        router.push(`/inventory/products/${result.data.id}`);
      } else {
        setMessage({ kind: "success", text: "Product saved." });
        router.refresh();
      }
    });
  };

  const disabled = !canManage || pending;

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-6" aria-describedby="product-form-status">
      <div id="product-form-status" aria-live="polite" className="empty:hidden">
        {message && <FormMessage kind={message.kind}>{message.text}</FormMessage>}
      </div>
      {!canManage && (
        <p className="rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)] p-3 text-sm text-[var(--color-text-secondary)]">
          You can view this product but cannot change it.
        </p>
      )}

      <fieldset disabled={disabled} className="grid gap-5 sm:grid-cols-2">
        <legend className="sr-only">Product details</legend>
        <TextField label="SKU" hint="Letters, digits, dots, dashes and underscores. Unique per company." error={errors.sku?.message} {...register("sku")} />
        <TextField label="Name" error={errors.name?.message} {...register("name")} />
        <div className="space-y-1.5">
          <label htmlFor="categoryId" className="text-sm font-semibold text-[var(--color-text-primary)]">Category</label>
          <select id="categoryId" className={selectClass} {...register("categoryId")}>
            <option value="">No category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {errors.categoryId?.message && <p role="alert" className="text-xs text-[#c0392b]">{errors.categoryId.message}</p>}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="unitOfMeasure" className="text-sm font-semibold text-[var(--color-text-primary)]">Unit of measure</label>
          <select id="unitOfMeasure" className={selectClass} {...register("unitOfMeasure")}>
            {UNITS_OF_MEASURE.map((unit) => (
              <option key={unit} value={unit}>
                {UNIT_LABELS[unit]}
              </option>
            ))}
          </select>
          {errors.unitOfMeasure?.message && <p role="alert" className="text-xs text-[#c0392b]">{errors.unitOfMeasure.message}</p>}
        </div>
        <TextField label="Standard cost" hint="Used for stock value. Up to 3 decimals." inputMode="decimal" error={errors.cost?.message} {...register("cost")} />
        <TextField label="Sale price" hint="Informational until sales are connected." inputMode="decimal" error={errors.salePrice?.message} {...register("salePrice")} />
        <TextField label="Reorder point" hint="Stock at or below this level is flagged as low." inputMode="decimal" error={errors.reorderPoint?.message} {...register("reorderPoint")} />
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="description" className="text-sm font-semibold text-[var(--color-text-primary)]">Description</label>
          <textarea id="description" rows={3} className={textareaClass} {...register("description")} />
          {errors.description?.message && <p role="alert" className="text-xs text-[#c0392b]">{errors.description.message}</p>}
        </div>
        <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:gap-8">
          <label className="inline-flex min-h-[44px] items-center gap-3 text-sm text-[var(--color-text-primary)]">
            <input type="checkbox" className="h-5 w-5 accent-[var(--color-action-primary)]" {...register("isStorable")} />
            Stored item (tracked in stock)
          </label>
          <label className="inline-flex min-h-[44px] items-center gap-3 text-sm text-[var(--color-text-primary)]">
            <input type="checkbox" className="h-5 w-5 accent-[var(--color-action-primary)]" {...register("isActive")} />
            Active (available for orders and stock moves)
          </label>
        </div>
      </fieldset>

      {canManage && (
        <div className="flex flex-col-reverse gap-3 border-t border-[var(--color-border-subtle)] pt-5 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => router.back()} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Saving…" : mode === "create" ? "Create product" : "Save changes"}
          </Button>
        </div>
      )}
    </form>
  );
}
