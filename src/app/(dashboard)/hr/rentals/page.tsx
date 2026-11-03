import type { Metadata } from "next";
import Link from "next/link";
import { getPageWorkspace } from "@/server/tenancy/workspace";
import {
  getWorkerRentalAgreements,
  getWorkerRentalStats,
} from "@/server/services/worker-rental.service";
import { WorkerRentalManager } from "@/features/hr/components/worker-rental/worker-rental-manager";

export const metadata: Metadata = {
  title: "Worker Rental & Subcontracting | AnOps HR",
  description:
    "Manage inter-company worker rentals, staff secondment agreements, daily timesheets, and contractor payouts.",
};

export default async function WorkerRentalsPage() {
  const workspace = await getPageWorkspace();
  const companyId = workspace.companyId.toHexString();

  const [agreements, stats] = await Promise.all([
    getWorkerRentalAgreements(companyId),
    getWorkerRentalStats(companyId),
  ]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/hr"
              className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
              ← Back to HR & Payroll
            </Link>
            <span className="text-xs text-[var(--color-text-secondary)]">/</span>
            <span className="text-xs font-medium text-[var(--color-text-primary)]">
              Worker Rentals
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)] mt-1">
            Worker Rental & Subcontracting Center
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Manage incoming rented workers from partner firms (Rent-In) and outgoing staff lending (Loan-Out), log project timesheets, and settle disbursements.
          </p>
        </div>
      </div>

      {/* Master Manager */}
      <WorkerRentalManager initialAgreements={agreements} stats={stats} />
    </div>
  );
}

