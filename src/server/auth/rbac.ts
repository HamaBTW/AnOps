import "server-only";
import { auth } from "@/server/auth";
import clientPromise from "@/server/db/client";
import type { EmployeeRole } from "@/server/auth/types";
import type { Employee } from "@/features/hr/types";

export type CurrentAuthContext = {
  userId: string;
  email: string;
  role: EmployeeRole;
  employee: Employee | null;
  isAdmin: boolean;
};

/**
 * Resolves the currently authenticated user along with their linked Employee record
 * and HR role permissions.
 */
export async function getCurrentAuthUser(): Promise<CurrentAuthContext | null> {
  const session = await auth();
  if (!session?.user?.email) {
    return null;
  }

  const email = session.user.email.toLowerCase().trim();
  let role = (session.user.role as EmployeeRole) || "employee";

  // Check admin fallback from environment
  const envAdminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  if (role === "employee" && envAdminEmail && email === envAdminEmail) {
    role = "hr_admin";
  }

  const client = await clientPromise;
  const db = client.db();
  const empDoc = await db.collection("employees").findOne({ email });

  let employee: Employee | null = null;
  if (empDoc) {
    employee = {
      id: empDoc._id.toString(),
      fullName: empDoc.fullName as string,
      email: empDoc.email as string,
      phone: empDoc.phone as string | undefined,
      jobTitle: empDoc.jobTitle as string,
      departmentId: empDoc.departmentId ? empDoc.departmentId.toString() : "",
      departmentName: (empDoc.departmentName || empDoc.deptName || "General") as string,
      hireDate: empDoc.hireDate as string,
      baseSalary: (empDoc.baseSalary as number) || 0,
      role: (empDoc.role as EmployeeRole) || role,
      status: empDoc.status as "active" | "inactive",
      leaveAllowance: (empDoc.leaveAllowance as number) || 25,
      createdAt: empDoc.createdAt ? (empDoc.createdAt as Date).toISOString() : new Date().toISOString(),
      updatedAt: empDoc.updatedAt ? (empDoc.updatedAt as Date).toISOString() : new Date().toISOString(),
    };
    if (empDoc.role) {
      role = empDoc.role as EmployeeRole;
    }
  }

  return {
    userId: session.user.id,
    email,
    role,
    employee,
    isAdmin: role === "hr_admin",
  };
}

/**
 * Throws or returns an error if the request is unauthenticated.
 */
export async function requireAuthUser(): Promise<CurrentAuthContext> {
  const user = await getCurrentAuthUser();
  if (!user) {
    throw new Error("Unauthorized. Please log in to continue.");
  }
  return user;
}

/**
 * Throws or returns an error if the request is not from an HR Administrator.
 */
export async function requireAdminUser(): Promise<CurrentAuthContext> {
  const user = await requireAuthUser();
  if (!user.isAdmin) {
    throw new Error("Forbidden: This action requires HR Administrator permissions.");
  }
  return user;
}
