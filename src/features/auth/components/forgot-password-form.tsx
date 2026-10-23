"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Field, Button } from "@/features/auth/components/auth-form";
import { forgotPasswordAction, type FormState } from "@/features/auth/actions/auth.action";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(forgotPasswordAction, {});

  return (
    <form action={action} className="space-y-4">
      {state.error && (
        <p role="alert" className="rounded-[var(--radius-control)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)]">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="rounded-[var(--radius-control)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)]">
          {state.success}
        </p>
      )}
      <Field label="Email" name="email" type="email" placeholder="you@company.com" autoComplete="email" />
      <Button type="submit" variant="primary" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>
      <p className="text-center text-sm text-[var(--color-text-secondary)]">
        <Link href="/login" className="hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
