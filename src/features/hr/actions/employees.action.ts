"use server";

import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { parseWithSchema } from "@/shared/lib/validation";
import { employeeSchema, updateEmployeeSchema, deactivateEmployeeSchema } from "@/features/hr/schemas/employee.schema";
import { ObjectId } from "mongodb";

type FormState = {
  error?: string;
  success?: string;
};

export async function requireHRAuth() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.status !== "active") {
    if (session.user.status === "banned") redirect("/banned");
    if (session.user.status === "unverified") redirect("/unverified");
  }
  return session;
}

export async function listEmployeesAction() {
  await requireHRAuth();

  try {
    const clientPromise = (await import("@/server/db/client")).default;
    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection<{
      _id: ObjectId;
      name: string;
      email: string;
      jobTitle: string;
      baseSalary: number;
      role: "employee" | "admin";
      status: "active" | "inactive";
      createdAt: Date;
      updatedAt: Date;
    }>("employees");

    const employees = await collection.find({}).sort({ name: 1 }).toArray();

    return employees.map((emp) => ({
      _id: emp._id.toString(),
      name: emp.name,
      email: emp.email,
      jobTitle: emp.jobTitle,
      baseSalary: emp.baseSalary,
      role: emp.role,
      status: emp.status,
      createdAt: emp.createdAt,
      updatedAt: emp.updatedAt,
    }));
  } catch (error) {
    console.error("Error listing employees:", error);
    throw new Error("Failed to load employees");
  }
}

export async function createEmployeeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireHRAuth();

  const data = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    jobTitle: formData.get("jobTitle") as string,
    baseSalary: parseFloat(formData.get("baseSalary") as string || "0"),
    role: formData.get("role") as "employee" | "admin",
    status: formData.get("status") as "active" | "inactive",
  };

  const parsed = parseWithSchema(employeeSchema, data);
  if (!parsed.success) {
    return { error: parsed.message };
  }

  try {
    const clientPromise = (await import("@/server/db/client")).default;
    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection("employees");
    const now = new Date();

    const employee = {
      _id: new ObjectId(),
      name: parsed.data.name,
      email: parsed.data.email,
      jobTitle: parsed.data.jobTitle,
      baseSalary: parsed.data.baseSalary,
      role: parsed.data.role,
      status: parsed.data.status,
      createdAt: now,
      updatedAt: now,
    };

    await collection.insertOne(employee);
    return { success: "Employee created successfully" };
  } catch (error) {
    console.error("Error creating employee:", error);
    return { error: "Failed to create employee" };
  }
}

export async function updateEmployeeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireHRAuth();

  const id = formData.get("id") as string;
  const data = {
    name: formData.get("name") as string | undefined,
    email: formData.get("email") as string | undefined,
    jobTitle: formData.get("jobTitle") as string | undefined,
    baseSalary: formData.get("baseSalary") ? parseFloat(formData.get("baseSalary") as string) : undefined,
    role: formData.get("role") as "employee" | "admin" | undefined,
    status: formData.get("status") as "active" | "inactive" | undefined,
  };

  const parsed = parseWithSchema(updateEmployeeSchema, { ...data, id });
  if (!parsed.success) {
    return { error: parsed.message };
  }

  try {
    const clientPromise = (await import("@/server/db/client")).default;
    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection("employees");
    const now = new Date();

    const update: Record<string, unknown> = {
      updatedAt: now,
    };

    if (parsed.data.name !== undefined) update.name = parsed.data.name;
    if (parsed.data.email !== undefined) update.email = parsed.data.email;
    if (parsed.data.jobTitle !== undefined) update.jobTitle = parsed.data.jobTitle;
    if (parsed.data.baseSalary !== undefined) update.baseSalary = parsed.data.baseSalary;
    if (parsed.data.role !== undefined) update.role = parsed.data.role;
    if (parsed.data.status !== undefined) update.status = parsed.data.status;

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: update }
    );

    if (result.matchedCount === 0) {
      throw new Error("Employee not found");
    }

    return { success: "Employee updated successfully" };
  } catch (error) {
    console.error("Error updating employee:", error);
    return { error: "Failed to update employee" };
  }
}

export async function deactivateEmployeeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireHRAuth();

  const id = formData.get("id") as string;
  const parsed = parseWithSchema(deactivateEmployeeSchema, { id });
  if (!parsed.success) {
    return { error: parsed.message };
  }

  try {
    const clientPromise = (await import("@/server/db/client")).default;
    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection("employees");

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: "inactive", updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      throw new Error("Employee not found");
    }

    return { success: "Employee deactivated successfully" };
  } catch (error) {
    console.error("Error deactivating employee:", error);
    return { error: "Failed to deactivate employee" };
  }
}