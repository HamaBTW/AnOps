import { AuthCard } from "@/features/auth/components/auth-form";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token || "";

  return (
    <AuthCard title="Set new password" description="Enter your new password">
      <ResetPasswordForm token={token} />
    </AuthCard>
  );
}
