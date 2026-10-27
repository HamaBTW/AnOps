"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { generateReplenishmentAction } from "@/features/purchasing/actions/purchasing.action";
import { Button, selectClass } from "@/shared/components/ui/button";

/**
 * Requests a new proposal. The server calculates the quantities and then asks the AI provider for explanations.
 * The button stays disabled until the server replies, so a double click cannot start two generations.
 */
export function ReplenishmentGenerateForm({ warehouses }: { warehouses: { id: string; code: string; name: string }[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await generateReplenishmentAction({
        warehouseId: String(form.get("warehouseId") ?? ""),
        horizonDays: String(form.get("horizonDays") ?? ""),
      });
      if (!result.ok) {
        setError(`${result.error.message} (ref ${result.error.requestId.slice(0, 8)})`);
        return;
      }
      router.push(`/purchasing/replenishment?proposal=${result.data.id}`);
      router.refresh();
    });
  }

  if (warehouses.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-secondary)]">
        Create an active warehouse before generating a proposal.{" "}
        <a className="underline" href="/inventory/warehouses">Go to warehouses</a>
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-[1fr_160px_auto] sm:items-end" aria-busy={pending}>
      <fieldset disabled={pending} className="contents">
        <div className="space-y-1.5">
          <label htmlFor="warehouseId" className="text-sm font-semibold">Warehouse</label>
          <select id="warehouseId" name="warehouseId" required defaultValue={warehouses[0].id} className={selectClass}>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.code} · {w.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="horizonDays" className="text-sm font-semibold">Days to cover</label>
          <input
            id="horizonDays"
            name="horizonDays"
            type="number"
            inputMode="numeric"
            min={1}
            max={90}
            step={1}
            defaultValue={14}
            required
            className="w-full min-h-[44px] rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] px-3 text-sm"
          />
        </div>
        <Button type="submit" variant="primary">{pending ? "Generating…" : "Generate proposal"}</Button>
      </fieldset>
      <p className="text-xs text-[var(--color-text-secondary)] sm:col-span-3">
        Quantities are calculated from stock facts. Writing the explanations can take several seconds.
      </p>
      {error && (
        <p role="alert" className="text-sm text-[var(--color-status-error)] sm:col-span-3">{error}</p>
      )}
    </form>
  );
}
