"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Field, Button } from "@/features/auth/components/auth-form";
import { registerAction, type FormState } from "@/features/auth/actions/auth.action";

export function RegisterForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(registerAction, {});

  return (
    <form action={action} className="space-y-4">
      {state.error && (
        <p role="alert" className="rounded-[var(--radius-control)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)]">
          {state.error}
        </p>
      )}
      <Field label="Full name" name="name" placeholder="John Doe" autoComplete="name" />
      <Field label="Email" name="email" type="email" placeholder="you@company.com" autoComplete="email" />
      <Field label="Password" name="password" type="password" placeholder="Minimum 8 characters" autoComplete="new-password" />
      <Field label="Confirm password" name="confirmPassword" type="password" placeholder="Re-enter password" autoComplete="new-password" />
      <Button type="submit" variant="primary" className="w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
      <p className="text-center text-sm text-[var(--color-text-secondary)]">
        Already have an account?{" "}
        <Link href="/login" className="text-[var(--color-text-primary)] font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
