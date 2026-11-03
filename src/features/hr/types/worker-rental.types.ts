export type RentalType = "rent_in" | "lend_out";
export type RateType = "hourly" | "daily" | "monthly" | "fixed";
export type RentalStatus = "draft" | "active" | "completed" | "terminated";
export type PaymentMethod = "bank_transfer" | "check" | "cash";
export type RecipientType = "worker" | "partner_company";

export interface WorkerRentalAgreement {
  id: string;
  companyId: string;
  agreementNumber: string;
  type: RentalType;

  // Worker Profile
  workerName: string;
  workerEmail?: string;
  workerPhone?: string;
  workerRole: string;
  workerNationalId?: string;
  internalEmployeeId?: string;

  // Partner Company (Company B)
  partnerCompanyName: string;
  partnerContactPerson?: string;
  partnerEmail?: string;
  partnerPhone?: string;
  partnerTaxId?: string;

  // Terms & Rates
  startDate: string;
  endDate: string;
  rateType: RateType;
  unitRate: number;
  currency: string;
  estimatedUnits: number;
  estimatedTotal: number;

  // Internal Assignment
  departmentId?: string;
  departmentName?: string;
  supervisorName?: string;
  projectReference?: string;

  // Status & Financials
  status: RentalStatus;
  totalLoggedUnits: number;
  totalCostIncurred: number;
  totalPaidAmount: number;
  remainingBalance: number;

  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkerRentalTimesheet {
  id: string;
  companyId: string;
  agreementId: string;
  workDate: string;
  unitsWorked: number;
  overtimeHours: number;
  unitRate: number;
  amount: number;
  taskDescription?: string;
  approvedBy?: string;
  createdAt: string;
}

export interface WorkerRentalPayment {
  id: string;
  companyId: string;
  agreementId: string;
  paymentDate: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  recipientType: RecipientType;
  recipientName: string;
  reference?: string;
  notes?: string;
  createdAt: string;
}

export interface WorkerRentalStats {
  totalAgreements: number;
  activeAgreements: number;
  rentInCount: number;
  lendOutCount: number;
  totalCostIncurred: number;
  totalPaidAmount: number;
  totalPendingBalance: number;
  currency: string;
}

export interface WorkerRentalFilters {
  status?: string;
  type?: string;
  search?: string;
}

