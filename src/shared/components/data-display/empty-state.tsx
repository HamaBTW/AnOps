import { ButtonLink } from "@/shared/components/ui/button";

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-border-control)] bg-[var(--color-bg-surface)] px-6 py-10 text-center">
      <p className="text-base font-semibold text-[var(--color-text-primary)]">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-[var(--color-text-secondary)]">{description}</p>
      {actionHref && actionLabel && (
        <div className="mt-5">
          <ButtonLink href={actionHref} variant="primary">
            {actionLabel}
          </ButtonLink>
        </div>
      )}
    </div>
  );
}
