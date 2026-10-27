import type { Metadata } from "next";
import { getFinanceService } from "@/server/services/finance.service";
import { ExpenseManager } from "@/features/finance/components/expense-manager";

export const metadata: Metadata = {
  title: "Expenses | Finance | AnOps ERP",
  description: "Track, approve, and settle business expenses.",
};

export default async function FinanceExpensesPage() {
  let expenses: any[] = [];
  let canManage = false;
  let canApprove = false;
  let canPay = false;

  try {
    const service = await getFinanceService();
    expenses = await service.listExpenses();
    canManage = service.hasPermission("finance.expense.manage");
    canApprove = service.hasPermission("finance.expense.approve");
    canPay = service.hasPermission("finance.expense.pay");
  } catch {
    expenses = [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
          Business Expenses
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Manage employee claims, operational expenditures, approval workflows, and settlements
        </p>
      </div>

      <ExpenseManager
        expenses={expenses}
        canManage={canManage}
        canApprove={canApprove}
        canPay={canPay}
      />
    </div>
  );
}
