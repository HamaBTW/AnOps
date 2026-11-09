import { FinanceCopilot } from "@/features/finance/components/finance-copilot";
import { requireAppAccess } from "@/server/platform/access";

/** Every Finance page gets the Finance Copilot button. */
export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  const access = await requireAppAccess("finance");
  return (
    <>
      {children}
      {access.entitlements.aiFeatures && <FinanceCopilot />}
    </>
  );
}
