import { AuthCard } from "@/features/auth/components/auth-form";
import { RegisterForm } from "@/features/auth/components/register-form";

export default function RegisterPage() {
  return (
    <AuthCard title="Create account" description="Get started with AnOps">
      <RegisterForm />
    </AuthCard>
  );
}
