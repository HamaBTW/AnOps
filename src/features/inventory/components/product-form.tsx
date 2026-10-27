"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { productInputSchema } from "@/features/inventory/schemas/inventory.schema";
import { createProductAction, updateProductAction } from "@/features/inventory/actions/inventory.action";
import { UNIT_LABELS, UNITS_OF_MEASURE } from "@/shared/domain/units";
import { Boxes, Check, DollarSign, LoaderCircle, Tags } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Field, FormActions, FormSection, Select, Textarea } from "@/shared/components/ui/form-kit";
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
      if (!navigator.onLine) {
        // True offline mode: save locally to IndexedDB and queue sync mutation
        try {
          const { queueOfflineMutation, saveOfflineRecord } = await import("@/shared/lib/offline-store");
          const offlineId = `offline_${Date.now()}`;
          const localRecord = { ...payload, id: offlineId, isOffline: true, createdAt: new Date().toISOString() };
          
          await saveOfflineRecord("inventory_products", offlineId, localRecord);
          await queueOfflineMutation(
            mode === "edit" && product ? "inventory.product.update" : "inventory.product.create",
            mode === "edit" && product ? { id: product.id, data: payload } : payload
          );

          setMessage({
            kind: "success",
            text: "Saved locally in Offline Mode! Changes are safely stored in your browser and will automatically sync when connection returns.",
          });
          return;
        } catch (e: any) {
          setMessage({ kind: "error", text: "Failed to store offline: " + (e?.message || "Unknown error") });
          return;
        }
      }

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

      <fieldset disabled={disabled} className="min-w-0 space-y-6">
        <legend className="sr-only">Product details</legend>
        <FormSection title="Identification" description="How this product is named and found." icon={Boxes}>
          <TextField label="SKU" required placeholder="e.g. RM-STEEL-001" hint="Letters, digits, dots, dashes and underscores. Unique per company." error={errors.sku?.message} {...register("sku")} />
          <TextField label="Name" required placeholder="e.g. Steel sheet 2 mm" error={errors.name?.message} {...register("name")} />
          <Field label="Category" htmlFor="categoryId" error={errors.categoryId?.message}>
            <Select id="categoryId" {...register("categoryId")}>
              <option value="">No category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Unit of measure" htmlFor="unitOfMeasure" required error={errors.unitOfMeasure?.message}>
            <Select id="unitOfMeasure" {...register("unitOfMeasure")}>
              {UNITS_OF_MEASURE.map((unit) => (
                <option key={unit} value={unit}>{UNIT_LABELS[unit]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Description" htmlFor="description" className="sm:col-span-2" hint="Optional. Specifications, grade or handling notes." error={errors.description?.message}>
            <Textarea id="description" rows={3} placeholder="e.g. Cold-rolled, 1250 × 2500 mm" {...register("description")} />
          </Field>
        </FormSection>

        <FormSection title="Pricing and stock" description="Values used for stock valuation and low-stock alerts." icon={DollarSign}>
          <TextField label="Standard cost" placeholder="0.000" hint="Used for stock value. Up to 3 decimals." inputMode="decimal" error={errors.cost?.message} {...register("cost")} />
          <TextField label="Sale price" placeholder="0.000" hint="Informational until sales are connected." inputMode="decimal" error={errors.salePrice?.message} {...register("salePrice")} />
          <TextField label="Reorder point" placeholder="e.g. 20" hint="Stock at or below this level is flagged as low." inputMode="decimal" error={errors.reorderPoint?.message} {...register("reorderPoint")} />
        </FormSection>

        <FormSection title="Tracking" description="Whether this product holds stock and can be used." icon={Tags}>
          <label className="inline-flex min-h-[44px] items-center gap-3 text-sm text-[var(--color-text-primary)]">
            <input type="checkbox" className="h-4 w-4 shrink-0 rounded-[calc(var(--radius-control)*0.5)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] accent-[var(--color-action-primary)] focus:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-[2px] focus-visible:ring-offset-[var(--color-bg-surface)]" {...register("isStorable")} />
            Stored item (tracked in stock)
          </label>
          <label className="inline-flex min-h-[44px] items-center gap-3 text-sm text-[var(--color-text-primary)]">
            <input type="checkbox" className="h-4 w-4 shrink-0 rounded-[calc(var(--radius-control)*0.5)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] accent-[var(--color-action-primary)] focus:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-[2px] focus-visible:ring-offset-[var(--color-bg-surface)]" {...register("isActive")} />
            Active (available for orders and stock moves)
          </label>
        </FormSection>
      </fieldset>

      {canManage && (
        <FormActions>
          <Button variant="secondary" onClick={() => router.back()} disabled={pending}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <Check aria-hidden className="size-4" />}
            {pending ? "Saving…" : mode === "create" ? "Create product" : "Save changes"}
          </Button>
        </FormActions>
      )}
    </form>
  );
}
