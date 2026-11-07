import type { Metadata } from "next";
import { getFinanceService } from "@/server/services/finance.service";
import { ReceiptScanner, type ReceiptItem } from "@/features/finance/components/receipt-scanner";
import { EmptyState } from "@/shared/components/data-display/empty-state";

export const metadata: Metadata = {
  title: "Receipt OCR & Extraction | Finance | AnOps ERP",
  description: "Scan receipts using AI, review extracted merchant/amounts, and convert into official expense claims.",
};

export default async function FinanceReceiptsPage() {
  let receipts: ReceiptItem[] = [];
  let categories: Array<{ id: string; name: string; active: boolean }> = [];
  let canScan = false;
  let canCreateExpense = false;
  let failed = false;
  try {
    const service = await getFinanceService();
    [receipts, categories] = await Promise.all([service.listReceiptExtractions(), service.listExpenseCategories()]);
    canScan = service.hasPermission("finance.receipt.ocr");
    canCreateExpense = service.hasPermission("finance.expense.manage");
  } catch (e) {
    if ((e as { digest?: string })?.digest === "DYNAMIC_SERVER_USAGE") throw e;
    console.error("[FinanceReceiptsPage] load failed", e instanceof Error ? e.name : "unknown");
    failed = true;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">Receipt Scanner</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">Photograph or upload a receipt; the AI fills in the expense for you to check.</p>
      </div>
      {failed ? (
        <EmptyState variant="error" title="Receipts could not be loaded" description="Reload the page. If it keeps failing, check your access to Finance." actionHref="/finance/receipts" actionLabel="Reload" />
      ) : (
        <ReceiptScanner initialReceipts={receipts} categories={categories.filter((c) => c.active)} canScan={canScan} canCreateExpense={canCreateExpense} />
      )}
    </div>
  );
}
