import "server-only";

import clientPromise from "@/server/db/client";
import { ObjectId } from "mongodb";
import type {
  WorkerRentalAgreement,
  WorkerRentalTimesheet,
  WorkerRentalPayment,
  WorkerRentalStats,
  WorkerRentalFilters,
} from "@/features/hr/types/worker-rental.types";

function requireCompanyId(companyId: string | ObjectId): ObjectId {
  if (companyId instanceof ObjectId) return companyId;
  if (!ObjectId.isValid(companyId)) throw new Error("Invalid company ID");
  return new ObjectId(companyId);
}

async function getNextAgreementNumber(cId: ObjectId): Promise<string> {
  const client = await clientPromise;
  const db = client.db();
  const year = new Date().getFullYear();
  const key = `worker_rental_${year}`;

  const res = await db.collection("hr_counters").findOneAndUpdate(
    { companyId: cId, key },
    { $inc: { seq: 1 }, $setOnInsert: { companyId: cId, key, createdAt: new Date() } },
    { upsert: true, returnDocument: "after" }
  );

  const seq = (res?.seq as number) || 1;
  return `WRA-${year}-${String(seq).padStart(4, "0")}`;
}

export async function getWorkerRentalAgreements(
  companyId: string | ObjectId,
  filters: WorkerRentalFilters = {}
): Promise<WorkerRentalAgreement[]> {
  const cId = requireCompanyId(companyId);
  const client = await clientPromise;
  const db = client.db();

  const query: Record<string, any> = { companyId: cId };

  if (filters.status && filters.status !== "all") {
    query.status = filters.status;
  }
  if (filters.type && filters.type !== "all") {
    query.type = filters.type;
  }
  if (filters.search && filters.search.trim()) {
    const term = filters.search.trim();
    query.$or = [
      { agreementNumber: { $regex: term, $options: "i" } },
      { workerName: { $regex: term, $options: "i" } },
      { workerRole: { $regex: term, $options: "i" } },
      { partnerCompanyName: { $regex: term, $options: "i" } },
      { departmentName: { $regex: term, $options: "i" } },
    ];
  }

  const docs = await db
    .collection("hr_worker_rentals")
    .find(query)
    .sort({ createdAt: -1 })
    .toArray();

  return docs.map((d: any) => ({
    id: d._id.toString(),
    companyId: d.companyId.toString(),
    agreementNumber: d.agreementNumber,
    type: d.type || "rent_in",
    workerName: d.workerName,
    workerEmail: d.workerEmail,
    workerPhone: d.workerPhone,
    workerRole: d.workerRole,
    workerNationalId: d.workerNationalId,
    internalEmployeeId: d.internalEmployeeId?.toString(),
    partnerCompanyName: d.partnerCompanyName,
    partnerContactPerson: d.partnerContactPerson,
    partnerEmail: d.partnerEmail,
    partnerPhone: d.partnerPhone,
    partnerTaxId: d.partnerTaxId,
    startDate: d.startDate,
    endDate: d.endDate,
    rateType: d.rateType || "daily",
    unitRate: Number(d.unitRate) || 0,
    currency: d.currency || "TND",
    estimatedUnits: Number(d.estimatedUnits) || 0,
    estimatedTotal: Number(d.estimatedTotal) || 0,
    departmentId: d.departmentId,
    departmentName: d.departmentName,
    supervisorName: d.supervisorName,
    projectReference: d.projectReference,
    status: d.status || "active",
    totalLoggedUnits: Number(d.totalLoggedUnits) || 0,
    totalCostIncurred: Number(d.totalCostIncurred) || 0,
    totalPaidAmount: Number(d.totalPaidAmount) || 0,
    remainingBalance: Number(d.remainingBalance) || 0,
    notes: d.notes,
    createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : new Date().toISOString(),
  }));
}

export async function getWorkerRentalAgreementById(
  companyId: string | ObjectId,
  agreementId: string
): Promise<WorkerRentalAgreement | null> {
  const cId = requireCompanyId(companyId);
  if (!ObjectId.isValid(agreementId)) return null;

  const client = await clientPromise;
  const db = client.db();
  const d = await db.collection("hr_worker_rentals").findOne({
    _id: new ObjectId(agreementId),
    companyId: cId,
  });

  if (!d) return null;

  return {
    id: d._id.toString(),
    companyId: d.companyId.toString(),
    agreementNumber: d.agreementNumber,
    type: d.type || "rent_in",
    workerName: d.workerName,
    workerEmail: d.workerEmail,
    workerPhone: d.workerPhone,
    workerRole: d.workerRole,
    workerNationalId: d.workerNationalId,
    internalEmployeeId: d.internalEmployeeId?.toString(),
    partnerCompanyName: d.partnerCompanyName,
    partnerContactPerson: d.partnerContactPerson,
    partnerEmail: d.partnerEmail,
    partnerPhone: d.partnerPhone,
    partnerTaxId: d.partnerTaxId,
    startDate: d.startDate,
    endDate: d.endDate,
    rateType: d.rateType || "daily",
    unitRate: Number(d.unitRate) || 0,
    currency: d.currency || "TND",
    estimatedUnits: Number(d.estimatedUnits) || 0,
    estimatedTotal: Number(d.estimatedTotal) || 0,
    departmentId: d.departmentId,
    departmentName: d.departmentName,
    supervisorName: d.supervisorName,
    projectReference: d.projectReference,
    status: d.status || "active",
    totalLoggedUnits: Number(d.totalLoggedUnits) || 0,
    totalCostIncurred: Number(d.totalCostIncurred) || 0,
    totalPaidAmount: Number(d.totalPaidAmount) || 0,
    remainingBalance: Number(d.remainingBalance) || 0,
    notes: d.notes,
    createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : new Date().toISOString(),
  };
}

export async function createWorkerRentalAgreement(
  companyId: string | ObjectId,
  data: any,
  userId: string
): Promise<{ id: string; agreementNumber: string }> {
  const cId = requireCompanyId(companyId);
  const client = await clientPromise;
  const db = client.db();

  const agreementNumber = await getNextAgreementNumber(cId);
  const now = new Date();

  const unitRate = Number(data.unitRate) || 0;
  const estimatedUnits = Number(data.estimatedUnits) || 0;
  const estimatedTotal = unitRate * estimatedUnits;

  const doc = {
    companyId: cId,
    agreementNumber,
    type: data.type || "rent_in",
    workerName: data.workerName.trim(),
    workerEmail: data.workerEmail?.trim() || undefined,
    workerPhone: data.workerPhone?.trim() || undefined,
    workerRole: data.workerRole.trim(),
    workerNationalId: data.workerNationalId?.trim() || undefined,
    internalEmployeeId: data.internalEmployeeId && ObjectId.isValid(data.internalEmployeeId)
      ? new ObjectId(data.internalEmployeeId)
      : undefined,
    partnerCompanyName: data.partnerCompanyName.trim(),
    partnerContactPerson: data.partnerContactPerson?.trim() || undefined,
    partnerEmail: data.partnerEmail?.trim() || undefined,
    partnerPhone: data.partnerPhone?.trim() || undefined,
    partnerTaxId: data.partnerTaxId?.trim() || undefined,
    startDate: data.startDate,
    endDate: data.endDate,
    rateType: data.rateType || "daily",
    unitRate,
    currency: data.currency || "TND",
    estimatedUnits,
    estimatedTotal,
    departmentId: data.departmentId || undefined,
    departmentName: data.departmentName || undefined,
    supervisorName: data.supervisorName || undefined,
    projectReference: data.projectReference || undefined,
    status: data.status || "active",
    totalLoggedUnits: 0,
    totalCostIncurred: 0,
    totalPaidAmount: 0,
    remainingBalance: 0,
    notes: data.notes?.trim() || undefined,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  };

  const res = await db.collection("hr_worker_rentals").insertOne(doc);
  return { id: res.insertedId.toString(), agreementNumber };
}

export async function updateWorkerRentalAgreement(
  companyId: string | ObjectId,
  agreementId: string,
  data: any,
  _userId: string
): Promise<boolean> {
  const cId = requireCompanyId(companyId);
  if (!ObjectId.isValid(agreementId)) return false;

  const client = await clientPromise;
  const db = client.db();

  const updates: Record<string, any> = { updatedAt: new Date() };

  if (data.type) updates.type = data.type;
  if (data.workerName) updates.workerName = data.workerName.trim();
  if (data.workerEmail !== undefined) updates.workerEmail = data.workerEmail?.trim() || null;
  if (data.workerPhone !== undefined) updates.workerPhone = data.workerPhone?.trim() || null;
  if (data.workerRole) updates.workerRole = data.workerRole.trim();
  if (data.workerNationalId !== undefined) updates.workerNationalId = data.workerNationalId?.trim() || null;
  if (data.partnerCompanyName) updates.partnerCompanyName = data.partnerCompanyName.trim();
  if (data.partnerContactPerson !== undefined) updates.partnerContactPerson = data.partnerContactPerson?.trim() || null;
  if (data.partnerEmail !== undefined) updates.partnerEmail = data.partnerEmail?.trim() || null;
  if (data.partnerPhone !== undefined) updates.partnerPhone = data.partnerPhone?.trim() || null;
  if (data.partnerTaxId !== undefined) updates.partnerTaxId = data.partnerTaxId?.trim() || null;
  if (data.startDate) updates.startDate = data.startDate;
  if (data.endDate) updates.endDate = data.endDate;
  if (data.rateType) updates.rateType = data.rateType;
  if (data.unitRate !== undefined) updates.unitRate = Number(data.unitRate) || 0;
  if (data.currency) updates.currency = data.currency;
  if (data.estimatedUnits !== undefined) updates.estimatedUnits = Number(data.estimatedUnits) || 0;
  if (data.estimatedUnits !== undefined && updates.unitRate !== undefined) {
    updates.estimatedTotal = updates.unitRate * updates.estimatedUnits;
  }
  if (data.departmentId !== undefined) updates.departmentId = data.departmentId || null;
  if (data.departmentName !== undefined) updates.departmentName = data.departmentName || null;
  if (data.supervisorName !== undefined) updates.supervisorName = data.supervisorName || null;
  if (data.projectReference !== undefined) updates.projectReference = data.projectReference || null;
  if (data.status) updates.status = data.status;
  if (data.notes !== undefined) updates.notes = data.notes?.trim() || null;

  const res = await db.collection("hr_worker_rentals").updateOne(
    { _id: new ObjectId(agreementId), companyId: cId },
    { $set: updates }
  );

  return res.matchedCount > 0;
}

export async function deleteWorkerRentalAgreement(
  companyId: string | ObjectId,
  agreementId: string
): Promise<boolean> {
  const cId = requireCompanyId(companyId);
  if (!ObjectId.isValid(agreementId)) return false;

  const client = await clientPromise;
  const db = client.db();
  const objId = new ObjectId(agreementId);

  await Promise.all([
    db.collection("hr_worker_rentals").deleteOne({ _id: objId, companyId: cId }),
    db.collection("hr_worker_rental_timesheets").deleteMany({ agreementId: objId, companyId: cId }),
    db.collection("hr_worker_rental_payments").deleteMany({ agreementId: objId, companyId: cId }),
  ]);

  return true;
}

// ==========================================
// Timesheets
// ==========================================

export async function getWorkerRentalTimesheets(
  companyId: string | ObjectId,
  agreementId: string
): Promise<WorkerRentalTimesheet[]> {
  const cId = requireCompanyId(companyId);
  if (!ObjectId.isValid(agreementId)) return [];

  const client = await clientPromise;
  const db = client.db();

  const docs = await db
    .collection("hr_worker_rental_timesheets")
    .find({ companyId: cId, agreementId: new ObjectId(agreementId) })
    .sort({ workDate: -1, createdAt: -1 })
    .toArray();

  return docs.map((d: any) => ({
    id: d._id.toString(),
    companyId: d.companyId.toString(),
    agreementId: d.agreementId.toString(),
    workDate: d.workDate,
    unitsWorked: Number(d.unitsWorked) || 0,
    overtimeHours: Number(d.overtimeHours) || 0,
    unitRate: Number(d.unitRate) || 0,
    amount: Number(d.amount) || 0,
    taskDescription: d.taskDescription,
    approvedBy: d.approvedBy,
    createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : new Date().toISOString(),
  }));
}

export async function logWorkerRentalTimesheet(
  companyId: string | ObjectId,
  data: {
    agreementId: string;
    workDate: string;
    unitsWorked: number;
    overtimeHours?: number;
    taskDescription?: string;
    approvedBy?: string;
  },
  _userId: string
): Promise<{ id: string }> {
  const cId = requireCompanyId(companyId);
  if (!ObjectId.isValid(data.agreementId)) throw new Error("Invalid agreement ID");

  const client = await clientPromise;
  const db = client.db();
  const agreementObjId = new ObjectId(data.agreementId);

  const agreement = await db.collection("hr_worker_rentals").findOne({
    _id: agreementObjId,
    companyId: cId,
  });

  if (!agreement) throw new Error("Worker rental agreement not found");

  const unitRate = Number(agreement.unitRate) || 0;
  const unitsWorked = Number(data.unitsWorked) || 0;
  const overtimeHours = Number(data.overtimeHours) || 0;
  // Overtime calculation: rateType hourly = 1.25x; rateType daily = (dailyRate / 8) * 1.25 * overtime
  const baseAmount = unitsWorked * unitRate;
  const hourlyEquivalent = agreement.rateType === "hourly" ? unitRate : unitRate / 8;
  const overtimeAmount = overtimeHours * (hourlyEquivalent * 1.25);
  const totalAmount = Math.round((baseAmount + overtimeAmount) * 1000) / 1000;

  const now = new Date();
  const doc = {
    companyId: cId,
    agreementId: agreementObjId,
    workDate: data.workDate,
    unitsWorked,
    overtimeHours,
    unitRate,
    amount: totalAmount,
    taskDescription: data.taskDescription?.trim() || undefined,
    approvedBy: data.approvedBy?.trim() || undefined,
    createdAt: now,
  };

  const res = await db.collection("hr_worker_rental_timesheets").insertOne(doc);

  // Recalculate agreement totals
  await recalculateAgreementFinancials(cId, agreementObjId);

  return { id: res.insertedId.toString() };
}

export async function deleteWorkerRentalTimesheet(
  companyId: string | ObjectId,
  timesheetId: string
): Promise<boolean> {
  const cId = requireCompanyId(companyId);
  if (!ObjectId.isValid(timesheetId)) return false;

  const client = await clientPromise;
  const db = client.db();

  const ts = await db.collection("hr_worker_rental_timesheets").findOne({
    _id: new ObjectId(timesheetId),
    companyId: cId,
  });

  if (!ts) return false;

  await db.collection("hr_worker_rental_timesheets").deleteOne({
    _id: new ObjectId(timesheetId),
    companyId: cId,
  });

  await recalculateAgreementFinancials(cId, ts.agreementId);
  return true;
}

// ==========================================
// Payments
// ==========================================

export async function getWorkerRentalPayments(
  companyId: string | ObjectId,
  agreementId: string
): Promise<WorkerRentalPayment[]> {
  const cId = requireCompanyId(companyId);
  if (!ObjectId.isValid(agreementId)) return [];

  const client = await clientPromise;
  const db = client.db();

  const docs = await db
    .collection("hr_worker_rental_payments")
    .find({ companyId: cId, agreementId: new ObjectId(agreementId) })
    .sort({ paymentDate: -1, createdAt: -1 })
    .toArray();

  return docs.map((d: any) => ({
    id: d._id.toString(),
    companyId: d.companyId.toString(),
    agreementId: d.agreementId.toString(),
    paymentDate: d.paymentDate,
    amount: Number(d.amount) || 0,
    currency: d.currency || "TND",
    paymentMethod: d.paymentMethod || "bank_transfer",
    recipientType: d.recipientType || "partner_company",
    recipientName: d.recipientName,
    reference: d.reference,
    notes: d.notes,
    createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : new Date().toISOString(),
  }));
}

export async function recordWorkerRentalPayment(
  companyId: string | ObjectId,
  data: {
    agreementId: string;
    paymentDate: string;
    amount: number;
    currency?: string;
    paymentMethod?: "bank_transfer" | "check" | "cash";
    recipientType?: "worker" | "partner_company";
    recipientName: string;
    reference?: string;
    notes?: string;
  },
  _userId: string
): Promise<{ id: string }> {
  const cId = requireCompanyId(companyId);
  if (!ObjectId.isValid(data.agreementId)) throw new Error("Invalid agreement ID");

  const client = await clientPromise;
  const db = client.db();
  const agreementObjId = new ObjectId(data.agreementId);

  const agreement = await db.collection("hr_worker_rentals").findOne({
    _id: agreementObjId,
    companyId: cId,
  });

  if (!agreement) throw new Error("Worker rental agreement not found");

  const amount = Number(data.amount) || 0;
  if (amount <= 0) throw new Error("Payment amount must be positive");

  const now = new Date();
  const doc = {
    companyId: cId,
    agreementId: agreementObjId,
    paymentDate: data.paymentDate,
    amount,
    currency: data.currency || agreement.currency || "TND",
    paymentMethod: data.paymentMethod || "bank_transfer",
    recipientType: data.recipientType || "partner_company",
    recipientName: data.recipientName.trim(),
    reference: data.reference?.trim() || undefined,
    notes: data.notes?.trim() || undefined,
    createdAt: now,
  };

  const res = await db.collection("hr_worker_rental_payments").insertOne(doc);

  // Recalculate agreement totals
  await recalculateAgreementFinancials(cId, agreementObjId);

  return { id: res.insertedId.toString() };
}

export async function deleteWorkerRentalPayment(
  companyId: string | ObjectId,
  paymentId: string
): Promise<boolean> {
  const cId = requireCompanyId(companyId);
  if (!ObjectId.isValid(paymentId)) return false;

  const client = await clientPromise;
  const db = client.db();

  const pay = await db.collection("hr_worker_rental_payments").findOne({
    _id: new ObjectId(paymentId),
    companyId: cId,
  });

  if (!pay) return false;

  await db.collection("hr_worker_rental_payments").deleteOne({
    _id: new ObjectId(paymentId),
    companyId: cId,
  });

  await recalculateAgreementFinancials(cId, pay.agreementId);
  return true;
}

// Helper: updates totalLoggedUnits, totalCostIncurred, totalPaidAmount, remainingBalance
async function recalculateAgreementFinancials(cId: ObjectId, agreementObjId: ObjectId) {
  const client = await clientPromise;
  const db = client.db();

  const [tsAgg, payAgg] = await Promise.all([
    db.collection("hr_worker_rental_timesheets").aggregate([
      { $match: { companyId: cId, agreementId: agreementObjId } },
      {
        $group: {
          _id: null,
          totalUnits: { $sum: "$unitsWorked" },
          totalAmount: { $sum: "$amount" },
        },
      },
    ]).toArray(),
    db.collection("hr_worker_rental_payments").aggregate([
      { $match: { companyId: cId, agreementId: agreementObjId } },
      {
        $group: {
          _id: null,
          totalPaid: { $sum: "$amount" },
        },
      },
    ]).toArray(),
  ]);

  const totalLoggedUnits = tsAgg[0]?.totalUnits || 0;
  const totalCostIncurred = tsAgg[0]?.totalAmount || 0;
  const totalPaidAmount = payAgg[0]?.totalPaid || 0;
  const remainingBalance = Math.max(0, totalCostIncurred - totalPaidAmount);

  await db.collection("hr_worker_rentals").updateOne(
    { _id: agreementObjId, companyId: cId },
    {
      $set: {
        totalLoggedUnits,
        totalCostIncurred,
        totalPaidAmount,
        remainingBalance,
        updatedAt: new Date(),
      },
    }
  );
}

// ==========================================
// Dashboard Stats
// ==========================================

export async function getWorkerRentalStats(
  companyId: string | ObjectId
): Promise<WorkerRentalStats> {
  const cId = requireCompanyId(companyId);
  const client = await clientPromise;
  const db = client.db();

  const agreements = await db
    .collection("hr_worker_rentals")
    .find({ companyId: cId })
    .toArray();

  let activeAgreements = 0;
  let rentInCount = 0;
  let lendOutCount = 0;
  let totalCostIncurred = 0;
  let totalPaidAmount = 0;
  let totalPendingBalance = 0;

  for (const a of agreements) {
    if (a.status === "active") activeAgreements++;
    if (a.type === "rent_in") rentInCount++;
    if (a.type === "lend_out") lendOutCount++;

    totalCostIncurred += Number(a.totalCostIncurred) || 0;
    totalPaidAmount += Number(a.totalPaidAmount) || 0;
    totalPendingBalance += Number(a.remainingBalance) || 0;
  }

  return {
    totalAgreements: agreements.length,
    activeAgreements,
    rentInCount,
    lendOutCount,
    totalCostIncurred,
    totalPaidAmount,
    totalPendingBalance,
    currency: "TND",
  };
}

