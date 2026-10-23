import { AuthCard } from "@/features/auth/components/auth-form";
import Link from "next/link";

export default function UnverifiedPage() {
  return (
    <AuthCard title="Verify your email" description="Check your inbox to verify your account">
      <div className="space-y-4 text-center">
        <p className="text-sm text-[var(--color-text-secondary)]">
          We've sent a verification link to your email. Please verify to activate your account.
        </p>
        <Link href="/login" className="inline-flex h-12 items-center justify-center w-full rounded-[var(--radius-control)] bg-[var(--color-action-primary)] text-sm font-semibold text-[var(--color-action-on-primary)] hover:bg-[var(--color-action-hover)]">
          Back to sign in
        </Link>
      </div>
    </AuthCard>
  );
}
