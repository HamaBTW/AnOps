import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPageWorkspace } from "@/server/tenancy/workspace";
import {
  getWorkerRentalAgreementById,
  getWorkerRentalTimesheets,
  getWorkerRentalPayments,
} from "@/server/services/worker-rental.service";
import { AgreementDetailClient } from "@/features/hr/components/worker-rental/agreement-detail-client";

export const metadata: Metadata = {
  title: "Worker Rental Agreement | AnOps HR",
};

export default async function WorkerRentalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workspace = await getPageWorkspace();
  const companyId = workspace.companyId.toHexString();

  const [agreement, timesheets, payments] = await Promise.all([
    getWorkerRentalAgreementById(companyId, id),
    getWorkerRentalTimesheets(companyId, id),
    getWorkerRentalPayments(companyId, id),
  ]);

  if (!agreement) {
    notFound();
  }

  return (
    <AgreementDetailClient
      agreement={agreement}
      timesheets={timesheets}
      payments={payments}
    />
  );
}

