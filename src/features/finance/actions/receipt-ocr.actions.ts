"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAuthUser } from "@/server/auth/rbac";
import { getActiveTenant } from "@/server/tenant/context";
import { getFinanceService } from "@/server/services/finance.service";
import { ai, type AiAttachment } from "@/server/ai";
import clientPromise from "@/server/db/client";
import { ObjectId } from "mongodb";

export type ActionResult<T = unknown> = { success?: boolean; error?: string; data?: T };

export type ReceiptItemLine = {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type ProposedExtraction = {
  vendor?: string | null;
  date?: string | null;
  amount?: number | null;
  currency?: string | null;
  tax?: number | null;
  total?: number | null;
  categoryHint?: string | null;
  notes?: string | null;
  confidence?: number;
  items?: ReceiptItemLine[];
};

export async function scanReceiptAction(formData: FormData): Promise<ActionResult<{
  receiptDocumentId: string;
  extractionId: string;
  proposed: ProposedExtraction;
}>> {
  try {
    const auth = await getCurrentAuthUser();
    if (!auth) return { error: "Unauthorized" };

    const tenant = await getActiveTenant();
    if (!tenant) return { error: "No active company" };

    const file = formData.get("receipt") as File | null;
    const manualText = (formData.get("receiptText") as string) || "";
    const manualNotes = (formData.get("notes") as string) || "";

    if ((!file || file.size === 0) && !manualText.trim()) {
      return { error: "Please upload a receipt file or paste receipt text." };
    }

    const fileName = file && file.name ? file.name : "manual-receipt.txt";
    const mimeType = file && file.type ? file.type : "text/plain";
    const fileSize = file ? file.size : manualText.length;

    const attachments: AiAttachment[] = [];
    let extractedFileText = manualText.trim();

    if (file && file.size > 0) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const isImage = mimeType.startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp|heic)$/i.test(fileName);
      const isPdf = mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
      const isText = mimeType.startsWith("text/") || /\.(txt|csv|json)$/i.test(fileName);

      if (isImage || isPdf) {
        const normalizedMime = isPdf
          ? "application/pdf"
          : (mimeType.startsWith("image/") ? mimeType : "image/jpeg");
        attachments.push({
          mimeType: normalizedMime,
          base64: buffer.toString("base64"),
        });
      } else if (isText) {
        const text = buffer.toString("utf-8");
        if (text) extractedFileText = (extractedFileText ? extractedFileText + "\n" : "") + text.slice(0, 5000);
      }
    }

    const client = await clientPromise;
    const db = client.db();
    const now = new Date();

    const docRes = await db.collection("finance_receipt_documents").insertOne({
      companyId: new ObjectId(tenant.companyId),
      storageKey: `pending/${Date.now()}-${fileName}`,
      mimeType,
      originalName: fileName,
      size: fileSize,
      uploadedBy: auth.userId,
      uploadedAt: now,
    });

    const receiptDocumentId = docRes.insertedId.toString();

    const prompt = `You are an expert OCR and financial document extraction AI for business receipts, vendor invoices, tax tickets, and expense slips.
Extract only verifiable fields from the receipt image or text provided.
Return a STRICT JSON object matching this schema:
{
  "vendor": string | null,
  "date": "YYYY-MM-DD" | null,
  "amount": number | null,
  "currency": "TND" | "USD" | "EUR" | "GBP" | null,
  "tax": number | null,
  "total": number | null,
  "categoryHint": string | null,
  "notes": string | null,
  "confidence": number,
  "items": [
    {
      "description": string,
      "quantity": number,
      "unitPrice": number,
      "total": number
    }
  ]
}
CategoryHint must be one of:
- "Office Supplies"
- "Meals & Entertainment"
- "Travel & Lodging"
- "Utilities & Telecom"
- "Software & IT"
- "Marketing & Ads"
- "Repairs & Maintenance"
- "Professional Services"

Guidelines:
1. Vendor: Store name, restaurant, hotel, or merchant at the top of the receipt.
2. Date: Purchase date in YYYY-MM-DD format.
3. Amount: Net subtotal (HT) before taxes. If only Total and Tax are present, amount = total - tax.
4. Tax: VAT/TVA or sales tax amount.
5. Total: Final total paid (TTC). If amount and tax are known, total = amount + tax.
6. Currency: If in Tunisia (DT, Dinar, Millimes, TND), use "TND". Otherwise detect USD, EUR, GBP.
7. Return raw JSON without markdown codeblocks or commentary.`;

    const userMessage = [
      `Receipt File: ${fileName} (${mimeType}, ${fileSize} bytes).`,
      extractedFileText ? `Extracted Text Content:\n${extractedFileText}` : (attachments.length > 0 ? "Attached receipt image/document for OCR scanning." : ""),
      manualNotes ? `User Note: ${manualNotes}` : "",
    ].filter(Boolean).join("\n\n");

    try {
      let result = "";
      if (attachments.length > 0) {
        result = await ai.askWithAttachments(userMessage, attachments, prompt, { jsonObject: true });
      } else {
        result = await ai.ask(userMessage, prompt, { jsonObject: true });
      }

      let proposed: ProposedExtraction = {};
      try {
        const cleaned = result.replace(/```json\s*/gi, "").replace(/```\s*$/g, "").trim();
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) {
          proposed = JSON.parse(match[0]);
        } else {
          proposed = JSON.parse(cleaned);
        }
      } catch {
        proposed = { notes: result.slice(0, 500), confidence: 0.35 };
      }

      // Sanitize fields
      if (proposed.amount != null) proposed.amount = Number(proposed.amount) || null;
      if (proposed.tax != null) proposed.tax = Number(proposed.tax) || 0;
      if (proposed.total != null) proposed.total = Number(proposed.total) || null;
      if (!proposed.total && proposed.amount) proposed.total = proposed.amount + (proposed.tax || 0);
      if (!proposed.amount && proposed.total) proposed.amount = Math.max(0, proposed.total - (proposed.tax || 0));
      if (!proposed.currency) proposed.currency = "TND";
      if (!proposed.confidence || typeof proposed.confidence !== "number") {
        proposed.confidence = proposed.vendor && proposed.total ? 0.94 : 0.70;
      }

      if (Array.isArray(proposed.items)) {
        proposed.items = proposed.items
          .filter((it: any) => it && typeof it.description === "string")
          .map((it: any) => ({
            description: String(it.description).trim(),
            quantity: Number(it.quantity) || 1,
            unitPrice: Number(it.unitPrice) || Number(it.total) || 0,
            total: Number(it.total) || (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0),
          }));
      } else {
        proposed.items = [];
      }

      const extRes = await db.collection("finance_receipt_extractions").insertOne({
        companyId: new ObjectId(tenant.companyId),
        receiptDocumentId: new ObjectId(receiptDocumentId),
        provider: "ai",
        model: attachments.length > 0 ? "vision-ocr" : "text-ocr",
        rawText: result.slice(0, 2000),
        proposed,
        reviewed: false,
        createdAt: now,
        updatedAt: now,
      });

      revalidatePath("/finance/receipts");
      return {
        success: true,
        data: {
          receiptDocumentId,
          extractionId: extRes.insertedId.toString(),
          proposed,
        },
      };
    } catch (aiErr) {
      console.error("[finance.receipt.ocr] AI failed", aiErr);
      const msg = aiErr instanceof Error ? aiErr.message : "AI OCR unavailable";
      return { error: `AI OCR failed: ${msg}. Please check API keys or paste receipt text.` };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to scan receipt";
    return { error: msg };
  }
}

export async function deleteReceiptExtractionAction(id: string): Promise<ActionResult> {
  try {
    const service = await getFinanceService();
    await service.deleteReceiptExtraction(id);
    revalidatePath("/finance/receipts");
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to delete extraction";
    return { error: msg };
  }
}

export async function markReceiptReviewedAction(id: string): Promise<ActionResult> {
  try {
    const service = await getFinanceService();
    await service.markReceiptReviewed(id);
    revalidatePath("/finance/receipts");
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to mark reviewed";
    return { error: msg };
  }
}

export async function batchScanReceiptsAction(formData: FormData): Promise<ActionResult<{
  processedCount: number;
  results: Array<{
    fileName: string;
    receiptDocumentId: string;
    extractionId: string;
    proposed: ProposedExtraction;
  }>;
}>> {
  try {
    const auth = await getCurrentAuthUser();
    if (!auth) return { error: "Unauthorized" };

    const tenant = await getActiveTenant();
    if (!tenant) return { error: "No active company" };

    const files = formData.getAll("receipts") as File[];
    const validFiles = files.filter((f) => f && f.size > 0);

    if (validFiles.length === 0) {
      return { error: "No valid files received for batch scan." };
    }

    const results: Array<{
      fileName: string;
      receiptDocumentId: string;
      extractionId: string;
      proposed: ProposedExtraction;
    }> = [];

    for (const file of validFiles) {
      const singleFormData = new FormData();
      singleFormData.set("receipt", file);
      const res = await scanReceiptAction(singleFormData);
      if (res.data) {
        results.push({
          fileName: file.name,
          receiptDocumentId: res.data.receiptDocumentId,
          extractionId: res.data.extractionId,
          proposed: res.data.proposed,
        });
      }
    }

    revalidatePath("/finance/receipts");
    return {
      success: true,
      data: {
        processedCount: results.length,
        results,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to run batch receipt OCR";
    return { error: msg };
  }
}
