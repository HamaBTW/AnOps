import { describe, expect, it, vi } from "vitest";

const emp = { id: "e1", fullName: "Nour Khemir", jobTitle: "Engineer", departmentName: "Eng", hireDate: "2024-01-15", dateOfBirth: "", baseSalary: 4400 };
vi.mock("@/server/db/client", () => ({
  default: Promise.resolve({ db: () => ({ collection: () => ({ find: () => ({ toArray: async () => [{ _id: { toString: () => "e1" }, fullName: "Nour Khemir" }] }) }) }) }),
}));
vi.mock("@/server/services/hr.service", () => ({
  getEmployeeById: async () => emp,
  getSoldeDeConge: async () => ({ earned: 11, taken: 3, reserved: 2, adjustments: 0, available: 6, unpaidDaysTaken: 2 }),
  getLeaveRequests: async () => [],
  getEmployeeLeavePolicy: async () => null,
  getLeaveTransactions: async () => [],
}));

import { HRAssistantAgent } from "@/features/hr/ai/hr-assistant.agent";

const ctx = (includePayroll: boolean) => ({ companyId: "507f1f77bcf86cd799439011", isAdmin: false, userRole: "employee", userEmployeeId: "e1", employeeId: "e1", userFullName: "Nour Khemir", userEmail: "n@x.test", includePayroll });

async function promptSentTo(includePayroll: boolean): Promise<string> {
  const complete = vi.fn(async () => ({ text: "ok", provider: "fake", model: "fake" }));
  await new HRAssistantAgent().chat([], "How is my leave balance computed?", ctx(includePayroll), complete);
  return JSON.stringify(complete.mock.calls);
}

describe("the HR assistant and salary data", () => {
  it("puts salary, daily rate and payroll deductions in the prompt only for a member with the sensitive-HR switch", async () => {
    const without = await promptSentTo(false);
    expect(without).not.toContain("4,400");
    expect(without).not.toContain("Daily Rate");
    expect(without).not.toContain("deducted from base salary");
    expect(without).toContain("not available to you through AI");
    expect(without).toContain("Available Balance");
    const withSwitch = await promptSentTo(true);
    expect(withSwitch).toContain("4,400");
    expect(withSwitch).toContain("deducted from base salary");
  });
});
