"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAuthUser } from "@/server/auth/rbac";
import { getActiveTenant } from "@/server/tenant/context";
import { getFinanceService } from "@/server/services/finance.service";
import { ai } from "@/server/ai";
import clientPromise from "@/server/db/client";
import { ObjectId } from "mongodb";

export type ActionResult<T = unknown> = { success?: boolean; error?: string; data?: T };

export type CollectionTone = "gentle" | "firm" | "final";
export type NoticeLanguage = "fr" | "en";

export async function generateInvoiceCollectionNoticeAction(input: {
  invoiceId: string;
  tone?: CollectionTone;
  language?: NoticeLanguage;
}): Promise<ActionResult<{ subject: string; letter: string }>> {
  try {
    const auth = await getCurrentAuthUser();
    if (!auth) return { error: "Unauthorized" };

    const tenant = await getActiveTenant();
    if (!tenant) return { error: "No active company" };

    const service = await getFinanceService();
    const invoice = await service.getInvoice(input.invoiceId);
    if (!invoice) return { error: "Invoice not found" };

    if (invoice.balance <= 0) {
      return { error: "This invoice is already fully paid. No reminder is required." };
    }

    const tone = input.tone || "gentle";
    const language = input.language || "fr";

    // Calculate overdue days
    let overdueDays = 0;
    if (invoice.dueDate) {
      const due = new Date(invoice.dueDate);
      const today = new Date();
      const diffTime = today.getTime() - due.getTime();
      overdueDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    }

    const fmt = (n: number) =>
      new Intl.NumberFormat("fr-TN", { style: "currency", currency: invoice.currency || "TND" }).format(n || 0);

    const toneInstructions: Record<CollectionTone, { fr: string; en: string }> = {
      gentle: {
        fr: "Ton amical, courtois et bienveillant. Rappel simple indiquant que la date d'échéance est passée ou approche, et demandant poliment la confirmation du paiement.",
        en: "Friendly, courteous, and polite tone. A gentle reminder that the due date has arrived or recently passed, asking for a status update on payment.",
      },
      firm: {
        fr: "Ton professionnel, ferme et formel. Rappel insistant soulignant le retard de paiement de plusieurs jours, demandant un règlement sous 48 à 72 heures pour éviter des pénalités.",
        en: "Professional, firm, and direct tone. Highlights the overdue delay, asks for immediate settlement within 48 to 72 hours to prevent disruption.",
      },
      final: {
        fr: "Mise en demeure formelle / Dernier avertissement avant procédure contentieuse. Ton juridique, strict et impératif. Exige le paiement immédiat du solde sous 48h.",
        en: "Formal final demand notice / Mise en demeure. Legal, strict, imperative tone. Demands immediate payment within 48 hours prior to legal escalation.",
      },
    };

    const systemPrompt = `You are an elite corporate financial controller and accounts receivable recovery specialist.
You draft professional, legally precise debt collection notices and payment reminder letters.
Rules:
- Respect the requested language strictly (${language === "fr" ? "French" : "English"}).
- Tone to adopt: ${toneInstructions[tone][language]}.
- Include exact details: Invoice number, issue date, due date, total amount, balance remaining, and recipient customer.
- Format output as a clean, ready-to-send message with an email Subject line on the first line formatted as: "SUBJECT: <subject>" followed by the complete body of the letter.`;

    const userPrompt = `Draft a payment collection reminder with the following financial data:
- Company Name (Creditor): ${invoice.company?.name || "Our Company"}
- Company Email: ${invoice.company?.email || ""}
- Company Phone: ${invoice.company?.phone || ""}
- Customer Name (Debtor): ${invoice.customer?.name || "Valued Client"}
- Customer Contact Email: ${invoice.customer?.email || ""}
- Invoice Number: ${invoice.invoiceNumber}
- Issue Date: ${invoice.issueDate}
- Due Date: ${invoice.dueDate || "Upon Receipt"}
- Overdue Days: ${overdueDays > 0 ? `${overdueDays} days overdue` : "Due / approaching due date"}
- Total Due (TTC): ${fmt(invoice.total)}
- Amount Paid so far: ${fmt(invoice.amountPaid)}
- Outstanding Balance Remaining: ${fmt(invoice.balance)}
- Currency: ${invoice.currency}
- Language: ${language === "fr" ? "French (Français)" : "English"}
- Level: ${tone.toUpperCase()}

Generate the subject line and letter body now.`;

    const rawResponse = await ai.ask(userPrompt, systemPrompt);

    // Parse subject and body
    let subject = language === "fr"
      ? `Rappel de paiement: Facture ${invoice.invoiceNumber} - ${invoice.company?.name || ""}`
      : `Payment Reminder: Invoice ${invoice.invoiceNumber} - ${invoice.company?.name || ""}`;

    let letter = rawResponse;

    const subjectMatch = rawResponse.match(/^SUBJECT:\s*(.+)$/im);
    if (subjectMatch) {
      subject = subjectMatch[1].trim();
      letter = rawResponse.replace(/^SUBJECT:\s*.+$/im, "").trim();
    }

    return {
      success: true,
      data: {
        subject,
        letter,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to generate collection notice";
    console.error("[finance.ai.dunning]", e);
    return { error: msg };
  }
}

export type ExpenseAuditResult = {
  status: "pass" | "warning" | "flagged";
  riskScore: number; // 0 to 100
  summary: string;
  isDuplicateRisk: boolean;
  duplicateCandidate?: {
    vendor: string;
    amount: number;
    date: string;
  };
  policyFlags: string[];
  recommendations: string[];
};

export async function auditExpenseAction(expenseId: string): Promise<ActionResult<ExpenseAuditResult>> {
  try {
    const auth = await getCurrentAuthUser();
    if (!auth) return { error: "Unauthorized" };

    const tenant = await getActiveTenant();
    if (!tenant) return { error: "No active company" };

    const client = await clientPromise;
    const db = client.db();
    const companyId = new ObjectId(tenant.companyId);

    const expense = await db.collection("finance_expenses").findOne({
      _id: new ObjectId(expenseId),
      companyId,
    });

    if (!expense) return { error: "Expense record not found" };

    // Fetch other recent expenses from the same company for duplicate & anomaly detection
    const recentExpenses = await db.collection("finance_expenses")
      .find({
        companyId,
        _id: { $ne: expense._id },
        status: { $in: ["submitted", "approved", "paid"] },
      })
      .sort({ expenseDate: -1 })
      .limit(30)
      .toArray();

    // Check weekend date
    const expDate = new Date(expense.expenseDate);
    const isWeekend = expDate.getDay() === 0 || expDate.getDay() === 6;

    const candidates = recentExpenses.map((r: any) => ({
      id: r._id.toString(),
      vendor: r.vendor || "",
      amount: r.total || r.amount || 0,
      date: r.expenseDate,
      category: r.categoryName || "",
      description: r.description || "",
    }));

    const systemPrompt = `You are a strict financial auditor and corporate expense policy compliance officer.
Audit the given employee expense claim against standard corporate compliance rules:
1. Duplicate detection: Compare against recent claims. Flag if same/similar vendor and amount occurs within 14 days.
2. Weekend/Holiday spend: Flag if incurred on weekends without client justification.
3. High amount anomaly: Highlight unusually high claims for the category.
4. Tax sanity: Check if tax/VAT is reasonable.

Return STRICT JSON matching this schema:
{
  "status": "pass" | "warning" | "flagged",
  "riskScore": number (0 to 100, where 0 is pristine, 100 is high risk),
  "summary": string,
  "isDuplicateRisk": boolean,
  "duplicateCandidate": { "vendor": string, "amount": number, "date": string } | null,
  "policyFlags": string[],
  "recommendations": string[]
}`;

    const userPrompt = `Audit this expense claim:
- Vendor: ${expense.vendor || "Unknown"}
- Category: ${expense.categoryName || "General"}
- Date: ${expense.expenseDate} (${isWeekend ? "WEEKEND" : "Weekday"})
- Net Amount (HT): ${expense.amount} ${expense.currency}
- Tax: ${expense.tax} ${expense.currency}
- Total: ${expense.total} ${expense.currency}
- Description: ${expense.description || "None"}
- Submitter Notes: ${expense.notes || "None"}

Recent Company Claims for Comparison (JSON):
${JSON.stringify(candidates.slice(0, 15))}

Provide your audit verdict in JSON.`;

    const raw = await ai.ask(userPrompt, systemPrompt, { jsonObject: true });

    let audit: ExpenseAuditResult = {
      status: "pass",
      riskScore: 10,
      summary: "Expense appears within regular operational parameters.",
      isDuplicateRisk: false,
      policyFlags: [],
      recommendations: ["Expense complies with standard approval policies."],
    };

    try {
      const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*$/g, "").trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        audit = JSON.parse(match[0]);
      } else {
        audit = JSON.parse(cleaned);
      }
    } catch {
      // Fallback rule-based audit if AI parsing failed
      const dup = candidates.find(
        (c) => c.vendor.toLowerCase() === (expense.vendor || "").toLowerCase() &&
               Math.abs(c.amount - expense.total) < 0.01 &&
               c.date === expense.expenseDate
      );
      if (dup) {
        audit = {
          status: "flagged",
          riskScore: 85,
          summary: "Potential duplicate claim detected with identical vendor, amount, and date.",
          isDuplicateRisk: true,
          duplicateCandidate: { vendor: dup.vendor, amount: dup.amount, date: dup.date },
          policyFlags: ["Exact duplicate match found in recent approved/paid claims."],
          recommendations: ["Verify with submitter before approving."],
        };
      }
    }

    return {
      success: true,
      data: audit,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to audit expense";
    console.error("[finance.ai.audit]", e);
    return { error: msg };
  }
}

export type FinancialBriefingResult = {
  healthScore: number; // 0 to 100
  healthStatus: "excellent" | "healthy" | "caution" | "critical";
  headline: string;
  executiveSummary: string;
  projected30DayOutlook: string;
  keyVulnerabilities: string[];
  actionablePriorities: string[];
  generatedAt: string;
};

export async function generateFinancialBriefingAction(): Promise<ActionResult<FinancialBriefingResult>> {
  try {
    const auth = await getCurrentAuthUser();
    if (!auth) return { error: "Unauthorized" };

    const tenant = await getActiveTenant();
    if (!tenant) return { error: "No active company" };

    const service = await getFinanceService();
    const kpi = await service.getDashboard();

    const client = await clientPromise;
    const db = client.db();
    const companyId = new ObjectId(tenant.companyId);

    // Fetch top overdue invoices and customers
    const overdueInvoices = await db.collection("finance_invoices")
      .find({
        companyId,
        status: { $in: ["posted", "partially_paid", "overdue"] },
        balance: { $gt: 0 },
      })
      .sort({ balance: -1 })
      .limit(8)
      .toArray();

    const topDebtors = overdueInvoices.map((inv: any) => ({
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customerName || "Customer",
      balance: inv.balance,
      dueDate: inv.dueDate,
    }));

    const systemPrompt = `You are a Chief Financial Officer (CFO) and senior corporate liquidity strategist.
Analyze the company's real-time financial ledger, accounts receivable aging, and expense metrics.
Provide an objective executive briefing on the financial runway and cash health.

Return STRICT JSON matching this schema:
{
  "healthScore": number (0 to 100, where 100 is pristine liquidity, 0 is insolvency risk),
  "healthStatus": "excellent" | "healthy" | "caution" | "critical",
  "headline": string (one sharp, punchy sentence),
  "executiveSummary": string (2-3 concise paragraphs evaluating cash flow, collection rate, and burn),
  "projected30DayOutlook": string (forecast of expected cash buffer and collections for the upcoming 30 days),
  "keyVulnerabilities": string[] (3 specific vulnerabilities identified in the ledger or receivables aging),
  "actionablePriorities": string[] (3 concrete action items for the finance team this month)
}`;

    const userPrompt = `Financial State of Company:
- Currency: ${kpi.currency}
- Net Cash Flow: ${kpi.netCashFlow} ${kpi.currency} (Settled Collections: ${kpi.totalPaid}, Paid Expenses: ${kpi.totalExpensesPaidAmount})
- Total Invoiced: ${kpi.totalInvoiced} ${kpi.currency} (Collection Rate: ${Math.round((kpi.totalPaid / (kpi.totalInvoiced || 1)) * 100)}%)
- Outstanding Receivables: ${kpi.outstanding} ${kpi.currency}
- Total Overdue Receivables: ${kpi.overdue} ${kpi.currency} (${kpi.overdueCount} invoices past due)
- Current Receivables (Not Overdue): ${Math.max(0, kpi.outstanding - kpi.overdue)} ${kpi.currency}
- Pending Unpaid Expenses: ${kpi.totalExpensesAmount - kpi.totalExpensesPaidAmount} ${kpi.currency} (Draft count: ${kpi.expensesDraft}, Submitted count: ${kpi.expensesSubmitted})
- Top Outstanding Debtors (JSON):
${JSON.stringify(topDebtors)}

Provide the executive financial briefing in JSON format.`;

    const raw = await ai.ask(userPrompt, systemPrompt, { jsonObject: true });

    let briefing: FinancialBriefingResult = {
      healthScore: 78,
      healthStatus: "healthy",
      headline: "Stable operating liquidity with healthy collection momentum.",
      executiveSummary: "Operating cash flow remains positive with steady collection rates. Receivables are largely contained within standard payment windows.",
      projected30DayOutlook: "Projected 30-day cash buffer remains positive assuming historical collection turnaround times.",
      keyVulnerabilities: ["Aging concentration in pending receivables."],
      actionablePriorities: ["Accelerate follow-ups on invoices approaching the 30-day mark."],
      generatedAt: new Date().toISOString(),
    };

    try {
      const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*$/g, "").trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        briefing = { ...JSON.parse(match[0]), generatedAt: new Date().toISOString() };
      } else {
        briefing = { ...JSON.parse(cleaned), generatedAt: new Date().toISOString() };
      }
    } catch {
      // Use heuristic defaults
      const score = kpi.netCashFlow > 0 ? 80 : 50;
      briefing.healthScore = score;
      briefing.healthStatus = score > 70 ? "healthy" : "caution";
    }

    return {
      success: true,
      data: briefing,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to generate financial briefing";
    console.error("[finance.ai.briefing]", e);
    return { error: msg };
  }
}

export type MatchedBankTransaction = {
  id: string;
  date: string;
  rawDescription: string;
  amount: number;
  currency: string;
  method: string;
  reference: string;
  matchedInvoiceId: string | null;
  matchedInvoiceNumber: string | null;
  matchedCustomerName: string | null;
  invoiceBalance: number | null;
  confidence: "high" | "medium" | "low" | "none";
  confidenceScore: number;
  matchReasoning: string;
};

export type MatchBankTransactionsResult = {
  transactions: MatchedBankTransaction[];
  totalParsed: number;
  totalMatched: number;
  totalAmount: number;
};

export async function matchBankStatementTransactionsAction(
  rawStatementText: string
): Promise<ActionResult<MatchBankTransactionsResult>> {
  try {
    const auth = await getCurrentAuthUser();
    if (!auth) return { error: "Unauthorized" };

    const tenant = await getActiveTenant();
    if (!tenant) return { error: "No active company" };

    if (!rawStatementText || rawStatementText.trim().length === 0) {
      return { error: "Please paste statement text to reconcile" };
    }

    const service = await getFinanceService();
    const openInvoices = await service.listUnpaidInvoices();

    const systemPrompt = `You are an automated bank statement reconciliation specialist.
Your task is to parse unstructured bank statement lines / remittance advice text and match each incoming transaction to an existing open invoice if a match is found.

List of open unpaid/partially paid invoices currently in the system:
${JSON.stringify(
  openInvoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    customerName: inv.customerName,
    balance: inv.balance,
    currency: inv.currency,
  }))
)}

Instructions:
1. Parse lines from the bank statement text into individual deposit/credit transactions (ignore negative debit fees or expenses).
2. For each transaction, extract:
   - "date": Date in ISO YYYY-MM-DD format (use current year 2026 if year is missing or inferred).
   - "rawDescription": Text of the transaction line.
   - "amount": Numerical amount (positive number).
   - "currency": e.g. "TND", "EUR", "USD" (default to "TND" if unspecified).
   - "method": "bank_transfer" | "check" | "cash" | "card" | "other".
   - "reference": Extract any transaction reference, wire ID, check number, or invoice reference found.
3. Compare against the open invoices:
   - Match by explicit invoice number (e.g. "INV-2026-00001", "INV 00001", "Facture 1").
   - Match by customer name and matching or partial balance amount.
   - Assign "matchedInvoiceId", "matchedInvoiceNumber", "matchedCustomerName", and "invoiceBalance".
   - If no match is found, set matchedInvoiceId to null.
4. Assign confidence:
   - "high" (confidenceScore 85-100): exact invoice number match OR exact debtor name + exact amount match.
   - "medium" (confidenceScore 50-84): matching debtor name with slight amount discrepancy or invoice number without customer name.
   - "low" / "none" (confidenceScore < 50): ambiguous transaction or no invoice match found.
   - Provide a clear, concise 1-sentence "matchReasoning" in English.

Return pure JSON matching this exact structure:
{
  "transactions": [
    {
      "id": "tx-1",
      "date": "2026-10-28",
      "rawDescription": "VIR SEPA ACME CORP INV-2026-00001 119000 DT",
      "amount": 119000,
      "currency": "TND",
      "method": "bank_transfer",
      "reference": "SEPA-ACME",
      "matchedInvoiceId": "...",
      "matchedInvoiceNumber": "INV-2026-00001",
      "matchedCustomerName": "Acme Corp",
      "invoiceBalance": 119000,
      "confidence": "high",
      "confidenceScore": 98,
      "matchReasoning": "Exact invoice number and matching balance."
    }
  ]
}`;

    const userPrompt = `Bank Statement Lines:
${rawStatementText.trim()}`;

    const raw = await ai.ask(userPrompt, systemPrompt, { jsonObject: true });

    let parsedTransactions: MatchedBankTransaction[] = [];
    try {
      const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*$/g, "").trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      const json = JSON.parse(match ? match[0] : cleaned);
      if (Array.isArray(json.transactions)) {
        parsedTransactions = json.transactions;
      }
    } catch {
      // Fallback simple line regex parser if AI returns non-standard JSON
      const lines = rawStatementText.split("\n").filter((l) => l.trim().length > 3);
      parsedTransactions = lines.map((line, idx) => {
        const numMatch = line.match(/(\d+[\d\s.,]*\d*)/);
        const amt = numMatch ? parseFloat(numMatch[0].replace(/\s/g, "").replace(",", ".")) : 100;
        const invMatch = openInvoices.find((inv) =>
          line.toLowerCase().includes(inv.invoiceNumber.toLowerCase())
        );
        return {
          id: `tx-${idx + 1}`,
          date: new Date().toISOString().slice(0, 10),
          rawDescription: line.trim(),
          amount: isNaN(amt) ? 0 : amt,
          currency: "TND",
          method: "bank_transfer",
          reference: `AI-LINE-${idx + 1}`,
          matchedInvoiceId: invMatch?.id || null,
          matchedInvoiceNumber: invMatch?.invoiceNumber || null,
          matchedCustomerName: invMatch?.customerName || null,
          invoiceBalance: invMatch?.balance || null,
          confidence: invMatch ? "high" : "none",
          confidenceScore: invMatch ? 90 : 10,
          matchReasoning: invMatch ? `Regex matched invoice ${invMatch.invoiceNumber}` : "No clear invoice reference detected",
        };
      });
    }

    const totalParsed = parsedTransactions.length;
    const totalMatched = parsedTransactions.filter((t) => t.matchedInvoiceId !== null).length;
    const totalAmount = parsedTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    return {
      success: true,
      data: {
        transactions: parsedTransactions,
        totalParsed,
        totalMatched,
        totalAmount,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to reconcile statement";
    console.error("[finance.ai.reconcile]", e);
    return { error: msg };
  }
}

export async function reconcileBankBatchAction(input: {
  transactions: Array<{
    date: string;
    amount: number;
    currency: string;
    method?: string;
    reference?: string;
    matchedInvoiceId?: string | null;
  }>;
}): Promise<ActionResult<{ reconciledCount: number; allocatedCount: number }>> {
  try {
    const auth = await getCurrentAuthUser();
    if (!auth) return { error: "Unauthorized" };

    const service = await getFinanceService();
    let reconciledCount = 0;
    let allocatedCount = 0;

    for (const tx of input.transactions) {
      if (!tx.amount || tx.amount <= 0) continue;

      const paymentId = await service.recordPayment(
        {
          paymentDate: tx.date || new Date().toISOString().slice(0, 10),
          amount: tx.amount,
          currency: tx.currency || "TND",
          method: tx.method || "bank_transfer",
          reference: tx.reference || "AI Bank Reconciliation",
          notes: "Auto-reconciled via AI Bank Statement Matcher",
        },
        auth.userId
      );
      reconciledCount++;

      if (tx.matchedInvoiceId) {
        try {
          await service.allocatePayment(
            paymentId,
            [
              {
                invoiceId: tx.matchedInvoiceId,
                amount: tx.amount,
              },
            ],
            auth.userId
          );
          allocatedCount++;
        } catch (allocErr) {
          console.warn("[reconcileBankBatchAction] Partial allocation warning:", allocErr);
        }
      }
    }

    revalidatePath("/finance/payments");
    revalidatePath("/finance/invoices");
    revalidatePath("/finance");

    return {
      success: true,
      data: {
        reconciledCount,
        allocatedCount,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to record batch reconciliation";
    return { error: msg };
  }
}

export type CustomerCreditRiskResult = {
  rating: "AAA" | "AA" | "A" | "BBB" | "BB" | "B" | "CCC" | "D";
  score: number;
  riskCategory: "Very Low Risk" | "Low Risk" | "Moderate Risk" | "High Risk" | "Critical Risk";
  recommendedPaymentTerms: string;
  recommendedCreditLimit: number;
  currency: string;
  historicalMetrics: {
    totalInvoiced: number;
    totalPaid: number;
    totalOutstanding: number;
    totalOverdue: number;
    overdueCount: number;
    settledCount: number;
    collectionRatePercent: number;
  };
  summary: string;
  keyFactors: string[];
  recommendedAction: string;
};

export async function analyzeCustomerCreditRiskAction(
  customerId: string
): Promise<ActionResult<CustomerCreditRiskResult>> {
  try {
    const auth = await getCurrentAuthUser();
    if (!auth) return { error: "Unauthorized" };

    const tenant = await getActiveTenant();
    if (!tenant) return { error: "No active company" };

    if (!ObjectId.isValid(customerId)) {
      return { error: "Invalid customer ID" };
    }

    const client = await clientPromise;
    const db = client.db();
    const custId = new ObjectId(customerId);
    const companyId = new ObjectId(tenant.companyId);

    const customer = await db
      .collection("finance_customers")
      .findOne({ _id: custId, companyId });

    if (!customer) {
      return { error: "Customer not found" };
    }

    // Aggregate customer invoices
    const invoices = await db
      .collection("finance_invoices")
      .find({ customerId: custId, companyId, status: { $ne: "void" } })
      .toArray();

    const todayStr = new Date().toISOString().slice(0, 10);
    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;
    let totalOverdue = 0;
    let overdueCount = 0;
    let settledCount = 0;

    for (const inv of invoices) {
      const invTotal = Number(inv.total) || 0;
      const invPaid = Number(inv.amountPaid) || 0;
      const invBal = Number(inv.balance) || 0;
      totalInvoiced += invTotal;
      totalPaid += invPaid;
      totalOutstanding += invBal;

      if (inv.status === "paid") {
        settledCount++;
      } else if (invBal > 0 && inv.dueDate && inv.dueDate < todayStr) {
        overdueCount++;
        totalOverdue += invBal;
      }
    }

    const collectionRatePercent =
      totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 100;

    const historicalMetrics = {
      totalInvoiced,
      totalPaid,
      totalOutstanding,
      totalOverdue,
      overdueCount,
      settledCount,
      collectionRatePercent,
    };

    const systemPrompt = `You are an automated commercial credit risk analyst and underwriting engine.
Evaluate customer payment reliability, delinquency risk, and recommend commercial credit terms and credit limits.

Output strictly valid JSON matching this structure:
{
  "rating": "AAA" | "AA" | "A" | "BBB" | "BB" | "B" | "CCC" | "D",
  "score": number between 0 and 100,
  "riskCategory": "Very Low Risk" | "Low Risk" | "Moderate Risk" | "High Risk" | "Critical Risk",
  "recommendedPaymentTerms": string (e.g. "Net 30 Days", "Net 15 Days", "50% Advance Deposit Required", "100% Upfront Cash Only"),
  "recommendedCreditLimit": number (credit ceiling in local currency),
  "summary": string (concise 2-sentence executive assessment of debtor reliability),
  "keyFactors": string[] (3 bullet points highlighting positive habits or risk signals),
  "recommendedAction": string (1 actionable step for account manager)
}`;

    const userPrompt = `Customer Profile:
- Name: ${customer.name}
- Tax ID: ${customer.taxId || "None provided"}
- Invoices Count: ${invoices.length}
- Historical Invoiced Total: ${totalInvoiced} TND
- Historical Paid Total: ${totalPaid} TND (${collectionRatePercent}% collection rate)
- Currently Outstanding: ${totalOutstanding} TND
- Currently Overdue: ${totalOverdue} TND across ${overdueCount} overdue invoice(s)
- Settled Invoices: ${settledCount}

Assess credit risk and provide structured underwriting JSON.`;

    const raw = await ai.ask(userPrompt, systemPrompt, { jsonObject: true });

    let result: CustomerCreditRiskResult = {
      rating: overdueCount > 0 ? "B" : totalInvoiced > 0 ? "A" : "BBB",
      score: overdueCount > 0 ? 55 : totalInvoiced > 0 ? 88 : 70,
      riskCategory: overdueCount > 0 ? "Moderate Risk" : "Low Risk",
      recommendedPaymentTerms: overdueCount > 0 ? "Net 15 Days or 50% Deposit" : "Net 30 Days",
      recommendedCreditLimit: Math.max(1000, Math.round((totalPaid * 0.4) || 5000)),
      currency: "TND",
      historicalMetrics,
      summary: "Customer displays consistent transaction volume with manageable exposure.",
      keyFactors: [
        `Collection rate stands at ${collectionRatePercent}%`,
        overdueCount > 0 ? `${overdueCount} invoice(s) currently past due` : "Zero overdue balances detected",
      ],
      recommendedAction: "Maintain standard commercial engagement terms.",
    };

    try {
      const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*$/g, "").trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match ? match[0] : cleaned);
      result = {
        ...result,
        ...parsed,
        historicalMetrics,
        currency: "TND",
      };
    } catch {
      // Keep defaults
    }

    return {
      success: true,
      data: result,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to analyze customer credit risk";
    console.error("[finance.ai.creditRisk]", e);
    return { error: msg };
  }
}
