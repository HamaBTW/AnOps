import type { Metadata } from "next";
import { getEmployees, getDepartments, getJobTitles, getHRDashboardStats } from "@/server/services/hr.service";
import { HRDashboardClient } from "@/features/hr/components/hr-dashboard-client";

export const metadata: Metadata = {
  title: "HR & Personnel | AnOps ERP",
  description: "Manage employees, predefined and custom job titles, departments, and payroll in AnOps.",
};

export default async function HRPage() {
  const [employees, departments, jobTitles, stats] = await Promise.all([
    getEmployees(),
    getDepartments(),
    getJobTitles(),
    getHRDashboardStats(),
  ]);

  return (
    <HRDashboardClient
      initialEmployees={employees}
      initialDepartments={departments}
      initialJobTitles={jobTitles}
      initialStats={stats}
    />
  );
}
