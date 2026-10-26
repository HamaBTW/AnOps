"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteTemplateAction, duplicateTemplateAction, setTemplateActiveAction } from "@/features/marketing/actions/templates.action";
import { Button } from "@/shared/components/ui/button";
import { FormMessage } from "@/shared/components/ui/form-message";
import { StatusBadge } from "@/shared/components/data-display/status-badge";
import { CHANNEL_LABELS } from "@/features/marketing/labels";
import type { TemplateDto } from "@/server/marketing/template.service";

/** Row actions for templates. Each action re-checks permission on the server. */
export function TemplateList({ templates, canManage }: { templates: TemplateDto[]; canManage: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  const run = (task: () => Promise<{ ok: boolean; error?: { message: string } }>, success: string) =>
    startTransition(async () => {
      setNotice(null);
      const result = await task();
      if (!result.ok) return setNotice({ kind: "error", text: result.error?.message ?? "Something went wrong." });
      setNotice({ kind: "success", text: success });
      router.refresh();
    });

  return (
    <div className="space-y-4">
      {notice && <FormMessage kind={notice.kind}>{notice.text}</FormMessage>}
      <ul className="divide-y divide-[var(--color-border-subtle)] rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
        {templates.map((template) => (
          <li key={template.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <Link href={`/marketing/templates/${template.id}`} className="break-words font-semibold underline-offset-2 hover:underline">{template.name}</Link>
              <p className="mt-1 line-clamp-2 break-words text-sm text-[var(--color-text-secondary)]">{template.body}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusBadge label={CHANNEL_LABELS[template.channel]} tone="info" />
                <StatusBadge label={template.isActive ? "Active" : "Inactive"} tone={template.isActive ? "success" : "neutral"} />
                <StatusBadge label={`v${template.version}`} tone="neutral" />
              </div>
            </div>
            {canManage && (
              <div className="flex flex-wrap gap-2">
                <Button disabled={pending} onClick={() => run(() => duplicateTemplateAction(template.id), "Template duplicated as an inactive copy.")}>Duplicate</Button>
                <Button
                  disabled={pending}
                  onClick={() => run(() => setTemplateActiveAction(template.id, { isActive: !template.isActive, expectedVersion: template.version }), template.isActive ? "Template deactivated." : "Template activated.")}
                >
                  {template.isActive ? "Deactivate" : "Activate"}
                </Button>
                <Button
                  variant="danger"
                  disabled={pending}
                  onClick={() => {
                    if (!window.confirm(`Delete "${template.name}"? This cannot be undone.`)) return;
                    run(() => deleteTemplateAction(template.id), "Template deleted.");
                  }}
                >
                  Delete
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
