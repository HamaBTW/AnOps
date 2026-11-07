import { FinanceCopilot } from "@/features/finance/components/finance-copilot";

/** Every Finance page gets the Finance Copilot button. */
export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <FinanceCopilot />
    </>
  );
}
