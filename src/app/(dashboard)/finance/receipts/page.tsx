import type { Metadata } from "next";
import { getFinanceService } from "@/server/services/finance.service";
import { ReceiptScanner } from "@/features/finance/components/receipt-scanner";

export const metadata: Metadata = {
  title: "Receipt OCR & Extraction | Finance | AnOps ERP",
  description: "Scan receipts using AI, review extracted merchant/amounts, and convert into official expense claims.",
};

export default async function FinanceReceiptsPage() {
  let receipts: any[] = [];
  try {
    const service = await getFinanceService();
    receipts = await service.listReceiptExtractions();
  } catch (e) {
    console.error("[FinanceReceiptsPage] Error loading receipts:", e);
    receipts = [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
          Receipt OCR & Expense Scanner
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Intelligent AI vision and text extraction: preview data and convert to expenses in 1 click
        </p>
      </div>

      <ReceiptScanner initialReceipts={receipts} />
    </div>
  );
}
