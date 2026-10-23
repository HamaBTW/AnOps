"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Field, Button } from "@/features/auth/components/auth-form";
import { loginAction, type FormState } from "@/features/auth/actions/auth.action";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(loginAction, {});

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      {state.error && (
        <p role="alert" className="rounded-[var(--radius-control)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)]">
          {state.error}
        </p>
      )}
      <Field label="Email" name="email" type="email" placeholder="you@company.com" autoComplete="email" />
      <Field label="Password" name="password" type="password" placeholder="Enter your password" autoComplete="current-password" />
      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" className="rounded" />
          <span>Remember me</span>
        </label>
        <Link href="/forgot-password" className="text-[var(--color-text-secondary)] hover:underline">
          Forgot password?
        </Link>
      </div>
      <Button type="submit" variant="primary" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-sm text-[var(--color-text-secondary)]">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-[var(--color-text-primary)] font-medium hover:underline">
          Create account
        </Link>
      </p>
    </form>
  );
}
