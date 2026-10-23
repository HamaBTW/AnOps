"use client";

import { useActionState } from "react";
import { Field, Button } from "@/features/auth/components/auth-form";
import { resetPasswordAction, type FormState } from "@/features/auth/actions/auth.action";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(resetPasswordAction, {});

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {state.error && (
        <p role="alert" className="rounded-[var(--radius-control)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)]">
          {state.error}
        </p>
      )}
      <Field label="New password" name="password" type="password" placeholder="Minimum 8 characters" autoComplete="new-password" />
      <Field label="Confirm password" name="confirmPassword" type="password" placeholder="Re-enter password" autoComplete="new-password" />
      <Button type="submit" variant="primary" className="w-full" disabled={pending}>
        {pending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
