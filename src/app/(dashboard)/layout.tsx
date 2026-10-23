import { DashboardShell } from "@/shared/components/layout/dashboard-shell";
import { requireActive } from "@/features/auth/actions/auth.action";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireActive();

  return (
    <DashboardShell
      user={{
        name: session.user.name ?? "Account",
        email: session.user.email ?? "",
      }}
    >
      {children}
    </DashboardShell>
  );
}
