"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  stockAdjustmentInputSchema,
  stockMoveInputSchema,
  stockTransferInputSchema,
} from "@/features/inventory/schemas/inventory.schema";
import {
  adjustStockAction,
  issueStockAction,
  receiveStockAction,
  transferStockAction,
} from "@/features/inventory/actions/inventory.action";
import { Button, selectClass } from "@/shared/components/ui/button";
import { FormMessage } from "@/shared/components/ui/form-message";
import { TextField } from "@/shared/components/ui/text-field";

export type StockOperation = "receive" | "issue" | "transfer" | "adjust";

type ProductOption = { id: string; sku: string; name: string; unitOfMeasure: string };
type WarehouseOption = { id: string; code: string; name: string };

const OPERATION_LABELS: Record<StockOperation, string> = {
  receive: "Receive",
  issue: "Issue",
  transfer: "Transfer",
  adjust: "Adjust count",
};

type Values = {
  productId: string;
  warehouseId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: string;
  delta: string;
  reason: string;
};

const EMPTY: Values = {
  productId: "",
  warehouseId: "",
  fromWarehouseId: "",
  toWarehouseId: "",
  quantity: "",
  delta: "",
  reason: "",
};

/** Each operation has its own schema, action and visible fields. The server re-validates every field. */
function operationConfig(operation: StockOperation) {
  switch (operation) {
    case "receive":
      return { schema: stockMoveInputSchema, submit: receiveStockAction };
    case "issue":
      return { schema: stockMoveInputSchema, submit: issueStockAction };
    case "transfer":
      return { schema: stockTransferInputSchema, submit: transferStockAction };
    case "adjust":
      return { schema: stockAdjustmentInputSchema, submit: adjustStockAction };
  }
}

export function StockOperationForm({
  products,
  warehouses,
  allowedOperations,
}: {
  products: ProductOption[];
  warehouses: WarehouseOption[];
  allowedOperations: StockOperation[];
}) {
  const router = useRouter();
  const [operation, setOperation] = useState<StockOperation>(allowedOperations[0]);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const config = operationConfig(operation);

  const { register, handleSubmit, reset, setError, clearErrors, formState: { errors } } = useForm<Values>({
    defaultValues: EMPTY,
  });

  const onSubmit = (values: Values) => {
    setMessage(null);
    clearErrors();
    // Each operation validates its own fields. The payload is parsed with that operation's schema here,
    // and the server parses it again before anything changes.
    const payload = buildPayload(operation, values);
    const parsed = config.schema.safeParse(payload);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? "");
        if (field in EMPTY) setError(field as keyof Values, { message: issue.message });
      }
      return;
    }
    startTransition(async () => {
      const result = await config.submit(payload);
      if (!result.ok) {
        setMessage({ kind: "error", text: `${result.error.message} (ref ${result.error.requestId.slice(0, 8)})` });
        return;
      }
      setMessage({ kind: "success", text: `${OPERATION_LABELS[operation]} recorded.` });
      reset({ ...EMPTY, productId: values.productId, warehouseId: values.warehouseId });
      router.refresh();
    });
  };

  const selectField = (id: keyof Values, label: string, options: { value: string; label: string }[], error?: string) => (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-[var(--color-text-primary)]">{label}</label>
      <select id={id} className={selectClass} aria-invalid={Boolean(error)} {...register(id)}>
        <option value="">Select…</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {error && <p role="alert" className="text-xs text-[#c0392b]">{error}</p>}
    </div>
  );

  const productOptions = products.map((p) => ({ value: p.id, label: `${p.sku} · ${p.name}` }));
  const warehouseOptions = warehouses.map((w) => ({ value: w.id, label: `${w.code} · ${w.name}` }));

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Stock operation" className="flex flex-wrap gap-2">
        {allowedOperations.map((op) => (
          <button
            key={op}
            type="button"
            role="tab"
            aria-selected={op === operation}
            onClick={() => {
              setOperation(op);
              setMessage(null);
            }}
            className={
              op === operation
                ? "min-h-[44px] rounded-[var(--radius-pill)] bg-[var(--color-action-primary)] px-4 text-sm font-semibold text-[var(--color-action-on-primary)]"
                : "min-h-[44px] rounded-[var(--radius-pill)] border border-[var(--color-border-control)] px-4 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]"
            }
          >
            {OPERATION_LABELS[op]}
          </button>
        ))}
      </div>

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" aria-live="polite">
        {selectField("productId", "Product", productOptions, errors.productId?.message)}
        {operation === "transfer" ? (
          <>
            {selectField("fromWarehouseId", "From warehouse", warehouseOptions, errors.fromWarehouseId?.message)}
            {selectField("toWarehouseId", "To warehouse", warehouseOptions, errors.toWarehouseId?.message)}
          </>
        ) : (
          selectField("warehouseId", "Warehouse", warehouseOptions, errors.warehouseId?.message)
        )}
        {operation === "adjust" ? (
          <TextField label="Change (use a minus for removals)" inputMode="decimal" hint="For example 5 or -2.5" error={errors.delta?.message} {...register("delta")} />
        ) : (
          <TextField label="Quantity" inputMode="decimal" error={errors.quantity?.message} {...register("quantity")} />
        )}
        <TextField
          label={operation === "adjust" ? "Reason (required)" : operation === "issue" ? "Reason (required)" : "Note (optional)"}
          error={errors.reason?.message}
          {...register("reason")}
        />
        {message && (
          <div className="sm:col-span-2">
            <FormMessage kind={message.kind}>{message.text}</FormMessage>
          </div>
        )}
        <div className="sm:col-span-2 flex justify-end">
          <Button type="submit" variant="primary" disabled={pending || products.length === 0 || warehouses.length === 0}>
            {pending ? "Recording…" : `Record ${OPERATION_LABELS[operation].toLowerCase()}`}
          </Button>
        </div>
      </form>
      {(products.length === 0 || warehouses.length === 0) && (
        <p className="text-sm text-[var(--color-text-secondary)]">Create at least one active product and one active warehouse before recording stock.</p>
      )}
    </div>
  );
}

/** Builds the request body for one operation. Only the fields that operation uses are sent. */
function buildPayload(operation: StockOperation, values: Values): Record<string, string> {
  if (operation === "transfer") {
    return { productId: values.productId, fromWarehouseId: values.fromWarehouseId, toWarehouseId: values.toWarehouseId, quantity: values.quantity, reason: values.reason };
  }
  if (operation === "adjust") {
    return { productId: values.productId, warehouseId: values.warehouseId, delta: values.delta, reason: values.reason };
  }
  return { productId: values.productId, warehouseId: values.warehouseId, quantity: values.quantity, reason: values.reason };
}
