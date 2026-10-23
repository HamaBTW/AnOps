import { AuthCard, Field, Button } from "@/components/auth/auth-form";
import Link from "next/link";

export default function LoginPage() {
  return (
    <AuthCard title="Sign in" description="Access your AnOps workspace">
      <form className="space-y-4">
        <Field label="Email" type="email" placeholder="you@company.com" />
        <Field label="Password" type="password" placeholder="Enter your password" />
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="rounded" />
            <span>Remember me</span>
          </label>
          <Link href="/forgot-password" className="text-[var(--color-text-secondary)] hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" variant="primary" className="w-full">
          Sign in
        </Button>
        <p className="text-center text-sm text-[var(--color-text-secondary)]">
          Don't have an account?{" "}
          <Link href="/register" className="text-[var(--color-text-primary)] font-medium hover:underline">
            Create account
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
