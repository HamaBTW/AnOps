"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useThreadActions } from "@/features/ai/components/thread-actions";
import { StatusBadge } from "@/shared/components/data-display/status-badge";
import { Button } from "@/shared/components/ui/button";
import { Field, FieldError, Select, Textarea } from "@/shared/components/ui/form-kit";
import { cn } from "@/shared/lib/utils";
import type { AiAction, AiDiffRow, AiFormPart, AiRecordCardPart, AiRecordTablePart } from "@/server/db/documents";

const inputClass =
  "min-h-[44px] w-full rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] px-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-[3px] focus:ring-[var(--color-focus-ring)] disabled:opacity-60 aria-[invalid=true]:border-[var(--color-status-error)]";

function ActionButtons({ actions, subject }: { actions: AiAction[]; subject: string }) {
  const { run, busy } = useThreadActions();
  if (actions.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a) => (
        <Button
          key={`${a.command}-${a.label}`}
          disabled={busy}
          aria-label={`${a.label}: ${subject}`}
          onClick={() => void run({ command: a.command, step: a.step ?? "start", args: a.args, label: `${a.label}: ${subject}` })}
          className="min-h-[44px] px-3"
        >
          {a.label}
        </Button>
      ))}
    </div>
  );
}

/** A table on tablet and desktop, a list of cards on phones: same data, same actions, no horizontal scrolling on small screens. */
export function RecordTable({ part }: { part: AiRecordTablePart }) {
  const { run, busy } = useThreadActions();
  const [first, ...rest] = part.columns;
  const paging = part.paging;

  return (
    <section aria-label={part.title} className="@container overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
      <header className="flex items-baseline justify-between gap-3 border-b border-[var(--color-border-subtle)] px-4 py-3">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{part.title}</h3>
        <span className="text-xs tabular-nums text-[var(--color-text-secondary)]">{part.total} total</span>
      </header>

      {part.rows.length === 0 ? (
        <p role="status" className="px-4 py-8 text-center text-sm text-[var(--color-text-secondary)]">{part.emptyMessage}</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto @2xl:block">
            <table className="w-full text-sm">
              <caption className="sr-only">{part.title}</caption>
              <thead>
                <tr className="text-left text-xs text-[var(--color-text-secondary)]">
                  {part.columns.map((c) => (
                    <th key={c.key} scope="col" className={cn("px-4 py-2 font-semibold", c.align === "right" && "text-right")}>{c.label}</th>
                  ))}
                  <th scope="col" className="px-4 py-2 font-semibold">Status</th>
                  <th scope="col" className="px-4 py-2"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)]">
                {part.rows.map((row) => (
                  <tr key={row.id} className="align-middle">
                    {part.columns.map((c, i) =>
                      i === 0 ? (
                        <th key={c.key} scope="row" className="px-4 py-1.5 text-left font-medium whitespace-nowrap text-[var(--color-text-primary)]">{row.cells[c.key]}</th>
                      ) : (
                        <td key={c.key} className={cn("max-w-[16rem] truncate px-4 py-1.5 text-[var(--color-text-primary)]", c.align === "right" && "text-right tabular-nums")}>{row.cells[c.key]}</td>
                      )
                    )}
                    <td className="px-4 py-1.5">{row.badge && <StatusBadge label={row.badge.label} tone={row.badge.tone} />}</td>
                    <td className="px-4 py-1.5"><div className="flex justify-end"><ActionButtons actions={row.actions ?? []} subject={row.cells[first.key]} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-[var(--color-border-subtle)] @2xl:hidden">
            {part.rows.map((row) => (
              <li key={row.id} className="space-y-2 px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 break-words text-sm font-semibold text-[var(--color-text-primary)]">{row.cells[first.key]}</p>
                  {row.badge && <StatusBadge label={row.badge.label} tone={row.badge.tone} />}
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
                  {rest.map((c) => (
                    <div key={c.key} className="contents">
                      <dt className="text-[var(--color-text-secondary)]">{c.label}</dt>
                      <dd className="min-w-0 break-words text-right text-[var(--color-text-primary)]">{row.cells[c.key]}</dd>
                    </div>
                  ))}
                </dl>
                <ActionButtons actions={row.actions ?? []} subject={row.cells[first.key]} />
              </li>
            ))}
          </ul>
        </>
      )}

      {paging && paging.totalPages > 1 && (
        <footer className="flex items-center justify-between gap-2 border-t border-[var(--color-border-subtle)] px-3 py-2">
          <Button
            variant="ghost"
            disabled={busy || paging.page <= 1}
            onClick={() => void run({ command: paging.command, step: "start", args: { ...paging.args, page: paging.page - 1 }, label: `${part.title}: page ${paging.page - 1}` })}
          >
            <ChevronLeft aria-hidden className="size-4" />
            Previous
          </Button>
          <span className="text-xs tabular-nums text-[var(--color-text-secondary)]">Page {paging.page} of {paging.totalPages}</span>
          <Button
            variant="ghost"
            disabled={busy || paging.page >= paging.totalPages}
            onClick={() => void run({ command: paging.command, step: "start", args: { ...paging.args, page: paging.page + 1 }, label: `${part.title}: page ${paging.page + 1}` })}
          >
            Next
            <ChevronRight aria-hidden className="size-4" />
          </Button>
        </footer>
      )}
    </section>
  );
}

export function RecordCard({ part }: { part: AiRecordCardPart }) {
  return (
    <section aria-label={part.title} className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="break-words text-base font-semibold text-[var(--color-text-primary)]">{part.title}</h3>
          {part.subtitle && <p className="text-sm text-[var(--color-text-secondary)]">{part.subtitle}</p>}
        </div>
        <div className="flex flex-wrap gap-1.5">{part.badges?.map((b) => <StatusBadge key={b.label} label={b.label} tone={b.tone} />)}</div>
      </div>
      <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
        {part.fields.map((f) => (
          <div key={f.label} className="flex items-baseline justify-between gap-3 border-b border-[var(--color-border-subtle)] pb-1.5 text-sm">
            <dt className="text-[var(--color-text-secondary)]">{f.label}</dt>
            <dd className="min-w-0 break-words text-right font-medium tabular-nums text-[var(--color-text-primary)]">{f.value}</dd>
          </div>
        ))}
      </dl>
      {part.sections?.map((s) => (
        <div key={s.title} className="mt-4">
          <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">{s.title}</h4>
          <dl className="mt-1 divide-y divide-[var(--color-border-subtle)]">
            {s.rows.map((r) => (
              <div key={r.label} className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
                <dt className="text-[var(--color-text-secondary)]">{r.label}</dt>
                <dd className="font-medium tabular-nums text-[var(--color-text-primary)]">{r.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
      {part.actions && part.actions.length > 0 && (
        <div className="mt-4 border-t border-[var(--color-border-subtle)] pt-3">
          <ActionButtons actions={part.actions} subject={part.title} />
        </div>
      )}
    </section>
  );
}

/** Before and after, from the server's own comparison of the validated change. */
export function DiffList({ rows }: { rows: AiDiffRow[] }) {
  if (rows.length === 0) return null;
  return (
    <dl className="mt-3 divide-y divide-[var(--color-border-subtle)] rounded-[var(--radius-control)] border border-[var(--color-border-subtle)]">
      {rows.map((r) => (
        <div key={r.label} className="grid gap-0.5 px-3 py-2 text-sm sm:grid-cols-[9rem_1fr] sm:gap-3">
          <dt className="text-[var(--color-text-secondary)]">{r.label}</dt>
          <dd className="min-w-0 break-words text-[var(--color-text-primary)]">
            {r.before !== undefined && (
              <>
                <span className="text-[var(--color-text-secondary)] line-through decoration-[var(--color-text-secondary)]/60">{r.before || "empty"}</span>
                <span aria-hidden className="mx-2 text-[var(--color-text-secondary)]">→</span>
                <span className="sr-only"> changed to </span>
              </>
            )}
            <span className="font-medium">{r.after || "empty"}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function GuidedForm({ part }: { part: AiFormPart }) {
  const { run, busy } = useThreadActions();
  const [values, setValues] = useState<Record<string, string | boolean>>(() => Object.fromEntries(part.fields.map((f) => [f.name, f.value ?? (f.kind === "checkbox" ? false : "")])));
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const missing = part.fields.some((f) => f.required && f.kind !== "checkbox" && String(values[f.name] ?? "").trim() === "");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setPending(true);
    const result = await run({ command: part.command, step: "submit", args: part.context, values: values as Record<string, string | boolean>, label: part.title });
    setPending(false);
    if (result.ok) {
      setSubmitted(true);
      return;
    }
    setError(result.error.message ?? "Something went wrong.");
    if (result.error.details) setFieldErrors(result.error.details);
  };

  return (
    <form onSubmit={submit} aria-label={part.title} noValidate className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4">
      <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{part.title}</h3>
      {part.description && <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">{part.description}</p>}
      <fieldset disabled={pending || submitted} className="mt-4 grid gap-4 sm:grid-cols-2">
        {part.fields.map((f) => {
          const id = `${part.command}-${f.name}`;
          const wide = f.kind === "textarea";
          if (f.kind === "checkbox") {
            return (
              <div key={f.name} className={cn("flex items-start gap-3 sm:col-span-2")}>
                <input id={id} type="checkbox" checked={Boolean(values[f.name])} onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.checked }))} className="mt-1 size-5 accent-[var(--color-text-primary)]" />
                <label htmlFor={id} className="min-h-[28px] text-sm text-[var(--color-text-primary)]">
                  {f.label}
                  {f.hint && <span className="block text-xs text-[var(--color-text-secondary)]">{f.hint}</span>}
                </label>
              </div>
            );
          }
          return (
            <Field key={f.name} label={f.label} htmlFor={id} required={f.required} hint={f.hint} error={fieldErrors[f.name]} className={cn(wide && "sm:col-span-2")}>
              {f.kind === "select" ? (
                <Select id={id} value={String(values[f.name] ?? "")} onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))} aria-invalid={Boolean(fieldErrors[f.name])}>
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </Select>
              ) : f.kind === "textarea" ? (
                <Textarea id={id} rows={2} value={String(values[f.name] ?? "")} onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))} aria-invalid={Boolean(fieldErrors[f.name])} />
              ) : (
                <input id={id} inputMode={f.kind === "number" ? "decimal" : undefined} value={String(values[f.name] ?? "")} placeholder={f.placeholder} onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))} aria-invalid={Boolean(fieldErrors[f.name])} aria-describedby={f.hint ? `${id}-hint` : undefined} className={inputClass} />
              )}
            </Field>
          );
        })}
      </fieldset>
      {error && Object.keys(fieldErrors).length === 0 && <FieldError>{error}</FieldError>}
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {submitted ? (
          <p role="status" className="text-sm text-[var(--color-text-secondary)]">Sent for your review below.</p>
        ) : (
          <Button type="submit" variant="primary" disabled={pending || busy || missing}>
            {pending && <Loader2 aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />}
            {part.submitLabel}
          </Button>
        )}
      </div>
    </form>
  );
}
