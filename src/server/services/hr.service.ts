import "server-only";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import clientPromise from "@/server/db/client";
import type {
  Department,
  JobTitle,
  Employee,
  HRDashboardStats,
  EmployeeFilterParams,
  LeaveRequest,
  LeaveBalance,
  LeaveType,
  LeaveStatus,
  AttendanceRecord,
  TodayAttendanceSummary,
  PayslipRecord,
  PayrollSummary,
  AIChatMessage,
} from "@/features/hr/types";
import type {
  EmployeeInput,
  LeaveRequestInput,
  LeaveReviewInput,
} from "@/features/hr/schemas/hr.schema";
import { COMPANY_POLICIES } from "@/features/hr/policies/company-policies";

const DEFAULT_DEPARTMENTS = [
  { name: "Engineering", description: "Software development, architecture and infrastructure" },
  { name: "Product & Design", description: "Product management, UX/UI and user research" },
  { name: "Human Resources", description: "People operations, talent acquisition and employee relations" },
  { name: "Finance & Accounting", description: "Financial planning, accounting and payroll" },
  { name: "Sales & Marketing", description: "Revenue growth, outreach and brand marketing" },
  { name: "Operations", description: "Business administration, facilities and logistics" },
];

const DEFAULT_JOB_TITLES = [
  { title: "Senior Software Engineer", deptName: "Engineering" },
  { title: "Full Stack Developer", deptName: "Engineering" },
  { title: "Frontend Specialist", deptName: "Engineering" },
  { title: "DevOps Engineer", deptName: "Engineering" },
  { title: "QA Engineer", deptName: "Engineering" },
  { title: "Product Manager", deptName: "Product & Design" },
  { title: "UI/UX Designer", deptName: "Product & Design" },
  { title: "HR Director", deptName: "Human Resources" },
  { title: "HR Specialist", deptName: "Human Resources" },
  { title: "Talent Acquisition Lead", deptName: "Human Resources" },
  { title: "Financial Analyst", deptName: "Finance & Accounting" },
  { title: "Senior Accountant", deptName: "Finance & Accounting" },
  { title: "Account Executive", deptName: "Sales & Marketing" },
  { title: "Marketing Strategist", deptName: "Sales & Marketing" },
  { title: "Operations Manager", deptName: "Operations" },
  { title: "Executive Assistant", deptName: "Operations" },
];

const DEFAULT_EMPLOYEES = [
  {
    fullName: "Mohamed Abidi",
    email: "mohamed.abidi@anops.internal",
    phone: "+216 20 123 456",
    jobTitle: "HR Director",
    deptName: "Human Resources",
    hireDate: "2023-01-15",
    baseSalary: 4200,
    role: "hr_admin" as const,
    status: "active" as const,
    leaveAllowance: 25,
  },
  {
    fullName: "Karim Ben Salah",
    email: "karim.bensalah@anops.internal",
    phone: "+216 21 234 567",
    jobTitle: "Senior Software Engineer",
    deptName: "Engineering",
    hireDate: "2023-03-01",
    baseSalary: 4800,
    role: "manager" as const,
    status: "active" as const,
    leaveAllowance: 25,
  },
  {
    fullName: "Nesrin Trabelsi",
    email: "nesrin.trabelsi@anops.internal",
    phone: "+216 22 345 678",
    jobTitle: "Marketing Strategist",
    deptName: "Sales & Marketing",
    hireDate: "2023-06-10",
    baseSalary: 3500,
    role: "employee" as const,
    status: "active" as const,
    leaveAllowance: 25,
  },
  {
    fullName: "Oussema Gharbi",
    email: "oussema.gharbi@anops.internal",
    phone: "+216 23 456 789",
    jobTitle: "Financial Analyst",
    deptName: "Finance & Accounting",
    hireDate: "2023-02-20",
    baseSalary: 3900,
    role: "employee" as const,
    status: "active" as const,
    leaveAllowance: 25,
  },
  {
    fullName: "Fatma Mansouri",
    email: "fatma.mansouri@anops.internal",
    phone: "+216 24 567 890",
    jobTitle: "UI/UX Designer",
    deptName: "Product & Design",
    hireDate: "2023-08-01",
    baseSalary: 3600,
    role: "employee" as const,
    status: "active" as const,
    leaveAllowance: 25,
  },
  {
    fullName: "Yassine Dridi",
    email: "yassine.dridi@anops.internal",
    phone: "+216 25 678 901",
    jobTitle: "Full Stack Developer",
    deptName: "Engineering",
    hireDate: "2024-01-10",
    baseSalary: 3200,
    role: "employee" as const,
    status: "active" as const,
    leaveAllowance: 25,
  },
  {
    fullName: "Sarra Bouazizi",
    email: "sarra.bouazizi@anops.internal",
    phone: "+216 26 789 012",
    jobTitle: "Operations Manager",
    deptName: "Operations",
    hireDate: "2023-11-15",
    baseSalary: 3700,
    role: "manager" as const,
    status: "active" as const,
    leaveAllowance: 25,
  },
  {
    fullName: "Amine Khelifi",
    email: "amine.khelifi@anops.internal",
    phone: "+216 27 890 123",
    jobTitle: "QA Engineer",
    deptName: "Engineering",
    hireDate: "2024-04-01",
    baseSalary: 2800,
    role: "employee" as const,
    status: "inactive" as const,
    leaveAllowance: 25,
  },
];

async function getDb() {
  const client = await clientPromise;
  return client.db();
}

export {
  calculateBusinessDays,
  formatDateYMD,
  calculateNetSalary,
} from "@/features/hr/utils/date-utils";
import {
  calculateBusinessDays,
  formatDateYMD,
  calculateNetSalary,
} from "@/features/hr/utils/date-utils";

let seedPromise: Promise<void> | null = null;

/**
 * Initializes and seeds default HR records (departments, predefined titles, demo employees,
 * sample leave requests, today's attendance, and sample payslips) if they do not exist yet.
 * Protected by a singleton in-flight seedPromise lock to eliminate concurrency race conditions.
 */
export async function seedHrDefaults(): Promise<void> {
  if (seedPromise) {
    return seedPromise;
  }

  seedPromise = (async () => {
    const db = await getDb();

    // 0. Ensure Admin Account from .env exists
    const envAdminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
    const envAdminPassword = process.env.ADMIN_PASSWORD;
    const envAdminName = process.env.ADMIN_NAME || "System Administrator";

    if (envAdminEmail && envAdminPassword) {
      const existingAdmin = await db.collection("users").findOne({ email: envAdminEmail });
      if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash(envAdminPassword, 12);
        await db.collection("users").insertOne({
          name: envAdminName,
          email: envAdminEmail,
          password: hashedPassword,
          role: "hr_admin",
          status: "active",
          emailVerified: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else if (existingAdmin.role !== "hr_admin") {
        await db.collection("users").updateOne(
          { _id: existingAdmin._id },
          { $set: { role: "hr_admin", updatedAt: new Date() } }
        );
      }
    }

    // 1. Departments
  const deptCount = await db.collection("departments").countDocuments();
  if (deptCount === 0) {
    const docs = DEFAULT_DEPARTMENTS.map((d) => ({
      ...d,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    await db.collection("departments").insertMany(docs);
  }

  const allDepts = await db.collection("departments").find().toArray();
  const deptMapByName = new Map<string, ObjectId>();
  allDepts.forEach((d) => deptMapByName.set(d.name, d._id as ObjectId));

  // 2. Predefined Job Titles
  const titleCount = await db.collection("job_titles").countDocuments();
  if (titleCount === 0) {
    const titleDocs = DEFAULT_JOB_TITLES.map((t) => ({
      title: t.title,
      departmentId: deptMapByName.get(t.deptName)?.toString() ?? "",
      isPredefined: true,
      createdAt: new Date(),
    }));
    await db.collection("job_titles").insertMany(titleDocs);
  }

  // 3. Demo Employees
  const demoMohamed = await db.collection("employees").findOne({ email: "mohamed.abidi@anops.internal" });
  if (!demoMohamed) {
    const empDocs = DEFAULT_EMPLOYEES.map((e) => {
      const deptId = deptMapByName.get(e.deptName)?.toString() ?? "";
      return {
        fullName: e.fullName,
        email: e.email.toLowerCase().trim(),
        phone: e.phone,
        jobTitle: e.jobTitle,
        departmentId: deptId,
        departmentName: e.deptName,
        hireDate: e.hireDate,
        baseSalary: e.baseSalary,
        role: e.role,
        status: e.status,
        leaveAllowance: e.leaveAllowance,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });
    await db.collection("employees").insertMany(empDocs);
  }

  // 4. Sample Leave Requests
  const leaveCount = await db.collection("leave_requests").countDocuments();
  if (leaveCount === 0) {
    const employees = await db.collection("employees").find().toArray();
    const mohamed = employees.find((e) => e.email === "mohamed.abidi@anops.internal");
    const karim = employees.find((e) => e.email === "karim.bensalah@anops.internal");
    const nesrin = employees.find((e) => e.email === "nesrin.trabelsi@anops.internal");
    const yassine = employees.find((e) => e.email === "yassine.dridi@anops.internal");

    const sampleLeaves = [];

    if (mohamed) {
      sampleLeaves.push({
        employeeId: (mohamed._id as ObjectId).toString(),
        employeeName: mohamed.fullName as string,
        departmentName: mohamed.departmentName as string,
        leaveType: "annual",
        isPaid: true,
        startDate: "2026-10-05",
        endDate: "2026-10-07",
        days: 3,
        reason: "Family vacation trip",
        status: "approved",
        adminComment: "Approved. Have a great vacation!",
        reviewedBy: "HR Admin",
        reviewedAt: new Date("2026-10-02"),
        createdAt: new Date("2026-10-01"),
        updatedAt: new Date("2026-10-02"),
      });
    }

    if (karim) {
      sampleLeaves.push({
        employeeId: (karim._id as ObjectId).toString(),
        employeeName: karim.fullName as string,
        departmentName: karim.departmentName as string,
        leaveType: "sick",
        isPaid: true,
        startDate: "2026-10-12",
        endDate: "2026-10-13",
        days: 2,
        reason: "Seasonal flu and doctor appointment",
        status: "approved",
        adminComment: "Medical certificate verified.",
        reviewedBy: "Mohamed Abidi",
        reviewedAt: new Date("2026-10-12"),
        createdAt: new Date("2026-10-11"),
        updatedAt: new Date("2026-10-12"),
      });
    }

    if (nesrin) {
      // Unpaid leave - will demonstrate payroll deduction
      sampleLeaves.push({
        employeeId: (nesrin._id as ObjectId).toString(),
        employeeName: nesrin.fullName as string,
        departmentName: nesrin.departmentName as string,
        leaveType: "unpaid",
        isPaid: false,
        startDate: "2026-10-19",
        endDate: "2026-10-20",
        days: 2,
        reason: "Personal family event (leave allowance exhausted)",
        status: "approved",
        adminComment: "Approved as unpaid leave. Deductions will apply in October payroll.",
        reviewedBy: "Mohamed Abidi",
        reviewedAt: new Date("2026-10-15"),
        createdAt: new Date("2026-10-14"),
        updatedAt: new Date("2026-10-15"),
      });
    }

    if (yassine) {
      // Pending leave request for admin approval demo
      sampleLeaves.push({
        employeeId: (yassine._id as ObjectId).toString(),
        employeeName: yassine.fullName as string,
        departmentName: yassine.departmentName as string,
        leaveType: "annual",
        isPaid: true,
        startDate: "2026-10-28",
        endDate: "2026-10-30",
        days: 3,
        reason: "Attending tech conference workshop",
        status: "pending",
        createdAt: new Date("2026-10-22"),
        updatedAt: new Date("2026-10-22"),
      });
    }

    if (sampleLeaves.length > 0) {
      await db.collection("leave_requests").insertMany(sampleLeaves);
    }
  }

  // 5. Sample Attendance for Today
  const todayYMD = formatDateYMD(new Date());
  const todayAttendanceCount = await db.collection("attendance").countDocuments({ date: todayYMD });
  if (todayAttendanceCount === 0) {
    const employees = await db.collection("employees").find({ status: "active" }).toArray();
    const mohamed = employees.find((e) => e.email === "mohamed.abidi@anops.internal");
    const karim = employees.find((e) => e.email === "karim.bensalah@anops.internal");
    const oussema = employees.find((e) => e.email === "oussema.gharbi@anops.internal");
    const fatma = employees.find((e) => e.email === "fatma.mansouri@anops.internal");

    const sampleAttendance = [];
    const checkInBase = new Date();
    checkInBase.setHours(8, 30, 0, 0);

    if (mohamed) {
      sampleAttendance.push({
        employeeId: (mohamed._id as ObjectId).toString(),
        employeeName: mohamed.fullName as string,
        departmentName: mohamed.departmentName as string,
        date: todayYMD,
        checkIn: new Date(checkInBase),
        checkOut: null,
        hoursWorked: 0,
        status: "present",
        createdAt: new Date(),
      });
    }

    if (karim) {
      const karimIn = new Date(checkInBase);
      karimIn.setMinutes(45);
      sampleAttendance.push({
        employeeId: (karim._id as ObjectId).toString(),
        employeeName: karim.fullName as string,
        departmentName: karim.departmentName as string,
        date: todayYMD,
        checkIn: karimIn,
        checkOut: null,
        hoursWorked: 0,
        status: "present",
        createdAt: new Date(),
      });
    }

    if (oussema) {
      const oussemaIn = new Date(checkInBase);
      oussemaIn.setHours(8, 15, 0, 0);
      const oussemaOut = new Date(checkInBase);
      oussemaOut.setHours(17, 15, 0, 0);
      sampleAttendance.push({
        employeeId: (oussema._id as ObjectId).toString(),
        employeeName: oussema.fullName as string,
        departmentName: oussema.departmentName as string,
        date: todayYMD,
        checkIn: oussemaIn,
        checkOut: oussemaOut,
        hoursWorked: 8.0,
        status: "checked_out",
        createdAt: new Date(),
      });
    }

    if (fatma) {
      const fatmaIn = new Date(checkInBase);
      fatmaIn.setHours(9, 0, 0, 0);
      sampleAttendance.push({
        employeeId: (fatma._id as ObjectId).toString(),
        employeeName: fatma.fullName as string,
        departmentName: fatma.departmentName as string,
        date: todayYMD,
        checkIn: fatmaIn,
        checkOut: null,
        hoursWorked: 0,
        status: "present",
        createdAt: new Date(),
      });
    }

    if (sampleAttendance.length > 0) {
      for (const att of sampleAttendance) {
        await db.collection("attendance").updateOne(
          { employeeId: att.employeeId, date: att.date },
          { $setOnInsert: att },
          { upsert: true }
        );
      }
    }
  }
  })().catch((err) => {
    seedPromise = null;
    throw err;
  });

  return seedPromise;
}

// ==========================================
// Department Service Methods
// ==========================================

export async function getDepartments(): Promise<Department[]> {
  const db = await getDb();
  await seedHrDefaults();

  const [departments, employees] = await Promise.all([
    db.collection("departments").find().sort({ name: 1 }).toArray(),
    db.collection("employees").find().toArray(),
  ]);

  const countsByDeptId = new Map<string, number>();
  employees.forEach((emp) => {
    if (emp.status === "active" && emp.departmentId) {
      countsByDeptId.set(emp.departmentId, (countsByDeptId.get(emp.departmentId) ?? 0) + 1);
    }
  });

  return departments.map((d) => ({
    id: (d._id as ObjectId).toString(),
    name: d.name as string,
    description: (d.description as string) ?? undefined,
    employeeCount: countsByDeptId.get((d._id as ObjectId).toString()) ?? 0,
    createdAt: d.createdAt ? (d.createdAt as Date).toISOString() : undefined,
  }));
}

export async function createDepartment(name: string, description?: string): Promise<Department> {
  const db = await getDb();
  const trimmed = name.trim();

  const existing = await db.collection("departments").findOne({
    name: { $regex: new RegExp(`^${trimmed}$`, "i") },
  });
  if (existing) {
    throw new Error(`Department "${trimmed}" already exists.`);
  }

  const result = await db.collection("departments").insertOne({
    name: trimmed,
    description: description?.trim() || "",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return {
    id: result.insertedId.toString(),
    name: trimmed,
    description: description?.trim() || undefined,
    employeeCount: 0,
    createdAt: new Date().toISOString(),
  };
}

export async function updateDepartment(id: string, name: string, description?: string): Promise<Department> {
  const db = await getDb();
  if (!ObjectId.isValid(id)) throw new Error("Invalid department ID.");
  const objId = new ObjectId(id);
  const trimmed = name.trim();

  const duplicate = await db.collection("departments").findOne({
    _id: { $ne: objId },
    name: { $regex: new RegExp(`^${trimmed}$`, "i") },
  });
  if (duplicate) {
    throw new Error(`Department "${trimmed}" already exists.`);
  }

  await db.collection("departments").updateOne(
    { _id: objId },
    { $set: { name: trimmed, description: description?.trim() ?? "", updatedAt: new Date() } }
  );

  await db.collection("employees").updateMany(
    { departmentId: id },
    { $set: { departmentName: trimmed, updatedAt: new Date() } }
  );

  const updated = await db.collection("departments").findOne({ _id: objId });
  return {
    id,
    name: trimmed,
    description: updated?.description as string | undefined,
    employeeCount: await db.collection("employees").countDocuments({ departmentId: id, status: "active" }),
    createdAt: updated?.createdAt ? (updated.createdAt as Date).toISOString() : undefined,
  };
}

export async function deleteDepartment(id: string): Promise<void> {
  const db = await getDb();
  if (!ObjectId.isValid(id)) throw new Error("Invalid department ID.");
  const objId = new ObjectId(id);

  const dept = await db.collection("departments").findOne({ _id: objId });
  if (!dept) throw new Error("Department not found.");

  const empCount = await db.collection("employees").countDocuments({ departmentId: id });
  if (empCount > 0) {
    throw new Error(
      `Cannot delete "${dept.name}" — it has ${empCount} employee(s) assigned. Reassign them first.`
    );
  }

  await db.collection("departments").deleteOne({ _id: objId });
}

export async function getEmployeesByDepartment(departmentId: string): Promise<Employee[]> {
  const db = await getDb();
  const docs = await db.collection("employees")
    .find({ departmentId })
    .sort({ status: 1, fullName: 1 })
    .toArray();

  return docs.map((doc) => ({
    id: (doc._id as ObjectId).toString(),
    fullName: (doc.fullName as string) || (doc.name as string) || "Unnamed Staff",
    email: (doc.email as string) || "",
    phone: (doc.phone as string) || undefined,
    jobTitle: (doc.jobTitle as string) || "Staff Member",
    departmentId: (doc.departmentId as string) || "",
    departmentName: (doc.departmentName as string) || "General",
    hireDate: (doc.hireDate as string) || "2024-01-01",
    baseSalary: Number(doc.baseSalary) || 0,
    status: (doc.status as "active" | "inactive") || "active",
    role: (doc.role as "employee" | "manager" | "hr_admin") || "employee",
    leaveAllowance: Number(doc.leaveAllowance) || 25,
    createdAt: doc.createdAt ? (doc.createdAt as Date).toISOString() : undefined,
    updatedAt: doc.updatedAt ? (doc.updatedAt as Date).toISOString() : undefined,
  }));
}

// ==========================================
// Job Title Service Methods
// ==========================================

export async function getJobTitles(): Promise<JobTitle[]> {
  const db = await getDb();
  await seedHrDefaults();

  const [jobTitles, employees] = await Promise.all([
    db.collection("job_titles").find().sort({ isPredefined: -1, title: 1 }).toArray(),
    db.collection("employees").find().toArray(),
  ]);

  const countsByTitle = new Map<string, number>();
  employees.forEach((emp) => {
    if (emp.status === "active" && emp.jobTitle) {
      const normalized = emp.jobTitle.trim().toLowerCase();
      countsByTitle.set(normalized, (countsByTitle.get(normalized) ?? 0) + 1);
    }
  });

  return jobTitles.map((t) => {
    const normalized = (t.title as string).trim().toLowerCase();
    return {
      id: (t._id as ObjectId).toString(),
      title: t.title as string,
      departmentId: (t.departmentId as string) || undefined,
      isPredefined: Boolean(t.isPredefined),
      employeeCount: countsByTitle.get(normalized) ?? 0,
      createdAt: t.createdAt ? (t.createdAt as Date).toISOString() : undefined,
    };
  });
}

export async function ensureJobTitle(title: string, departmentId?: string, isPredefined = false): Promise<JobTitle> {
  const db = await getDb();
  const trimmed = title.trim();
  if (!trimmed) {
    throw new Error("Job title cannot be empty.");
  }

  const existing = await db.collection("job_titles").findOne({
    title: { $regex: new RegExp(`^${trimmed}$`, "i") },
  });

  if (existing) {
    return {
      id: (existing._id as ObjectId).toString(),
      title: existing.title as string,
      departmentId: (existing.departmentId as string) || undefined,
      isPredefined: Boolean(existing.isPredefined),
    };
  }

  const insertResult = await db.collection("job_titles").insertOne({
    title: trimmed,
    departmentId: departmentId || "",
    isPredefined,
    createdAt: new Date(),
  });

  return {
    id: insertResult.insertedId.toString(),
    title: trimmed,
    departmentId: departmentId || undefined,
    isPredefined,
    createdAt: new Date().toISOString(),
  };
}

export async function updateJobTitle(id: string, title: string, departmentId?: string): Promise<JobTitle> {
  const db = await getDb();
  if (!ObjectId.isValid(id)) throw new Error("Invalid job title ID.");
  const objId = new ObjectId(id);

  const existing = await db.collection("job_titles").findOne({ _id: objId });
  if (!existing) throw new Error("Job title not found.");
  if (existing.isPredefined) throw new Error("Predefined job titles cannot be renamed.");

  const trimmed = title.trim();

  const dup = await db.collection("job_titles").findOne({
    _id: { $ne: objId },
    title: { $regex: new RegExp(`^${trimmed}$`, "i") },
  });
  if (dup) throw new Error(`A job title "${trimmed}" already exists.`);

  const oldTitle = existing.title as string;
  await db.collection("job_titles").updateOne(
    { _id: objId },
    { $set: { title: trimmed, departmentId: departmentId ?? existing.departmentId, updatedAt: new Date() } }
  );

  await db.collection("employees").updateMany(
    { jobTitle: { $regex: new RegExp(`^${oldTitle}$`, "i") } },
    { $set: { jobTitle: trimmed, updatedAt: new Date() } }
  );

  return {
    id,
    title: trimmed,
    departmentId: (departmentId ?? existing.departmentId as string) || undefined,
    isPredefined: false,
    createdAt: existing.createdAt ? (existing.createdAt as Date).toISOString() : undefined,
  };
}

export async function deleteJobTitle(id: string): Promise<void> {
  const db = await getDb();
  const objId = new ObjectId(id);
  const titleDoc = await db.collection("job_titles").findOne({ _id: objId });

  if (!titleDoc) {
    throw new Error("Job title not found.");
  }

  if (titleDoc.isPredefined) {
    throw new Error("Predefined system job titles cannot be deleted.");
  }

  const inUse = await db.collection("employees").findOne({
    jobTitle: { $regex: new RegExp(`^${titleDoc.title}$`, "i") },
  });
  if (inUse) {
    throw new Error(`Cannot delete "${titleDoc.title}" because it is currently assigned to one or more employees.`);
  }

  await db.collection("job_titles").deleteOne({ _id: objId });
}

export async function getEmployeesByJobTitle(title: string): Promise<Employee[]> {
  const db = await getDb();
  const docs = await db
    .collection("employees")
    .find({ jobTitle: { $regex: new RegExp(`^${title}$`, "i") } })
    .sort({ status: 1, fullName: 1 })
    .toArray();

  return docs.map((doc) => ({
    id: (doc._id as ObjectId).toString(),
    fullName: (doc.fullName as string) || (doc.name as string) || "Unnamed Staff",
    email: (doc.email as string) || "",
    phone: (doc.phone as string) || undefined,
    jobTitle: (doc.jobTitle as string) || title,
    departmentId: (doc.departmentId as string) || "",
    departmentName: (doc.departmentName as string) || "General",
    hireDate: (doc.hireDate as string) || "2024-01-01",
    baseSalary: Number(doc.baseSalary) || 0,
    status: (doc.status as "active" | "inactive") || "active",
    role: (doc.role as "employee" | "manager" | "hr_admin") || "employee",
    leaveAllowance: Number(doc.leaveAllowance) || 25,
    createdAt: doc.createdAt ? (doc.createdAt as Date).toISOString() : undefined,
    updatedAt: doc.updatedAt ? (doc.updatedAt as Date).toISOString() : undefined,
  }));
}

// ==========================================
// Employee Service Methods
// ==========================================

export async function getEmployees(filters: EmployeeFilterParams = {}): Promise<Employee[]> {
  const db = await getDb();
  await seedHrDefaults();

  const query: Record<string, unknown> = {};

  if (filters.status && filters.status !== "all") {
    query.status = filters.status;
  }

  if (filters.departmentId) {
    query.departmentId = filters.departmentId;
  }

  if (filters.search && filters.search.trim()) {
    const term = filters.search.trim();
    query.$or = [
      { fullName: { $regex: term, $options: "i" } },
      { email: { $regex: term, $options: "i" } },
      { jobTitle: { $regex: term, $options: "i" } },
    ];
  }

  const docs = await db.collection("employees").find(query).sort({ fullName: 1 }).toArray();

  return docs.map((doc) => ({
    id: (doc._id as ObjectId).toString(),
    fullName: (doc.fullName as string) || (doc.name as string) || "Unnamed Staff",
    email: (doc.email as string) || "",
    phone: (doc.phone as string) || undefined,
    jobTitle: (doc.jobTitle as string) || "Staff Member",
    departmentId: (doc.departmentId as string) || "",
    departmentName: (doc.departmentName as string) || "General",
    hireDate: (doc.hireDate as string) || "2024-01-01",
    baseSalary: Number(doc.baseSalary) || 0,
    status: (doc.status as "active" | "inactive") || "active",
    role: (doc.role as "employee" | "manager" | "hr_admin") || "employee",
    leaveAllowance: Number(doc.leaveAllowance) || 25,
    createdAt: doc.createdAt ? (doc.createdAt as Date).toISOString() : undefined,
    updatedAt: doc.updatedAt ? (doc.updatedAt as Date).toISOString() : undefined,
  }));
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  const db = await getDb();
  if (!ObjectId.isValid(id)) return null;

  const doc = await db.collection("employees").findOne({ _id: new ObjectId(id) });
  if (!doc) return null;

  return {
    id: (doc._id as ObjectId).toString(),
    fullName: (doc.fullName as string) || (doc.name as string) || "Unnamed Staff",
    email: (doc.email as string) || "",
    phone: (doc.phone as string) || undefined,
    jobTitle: (doc.jobTitle as string) || "Staff Member",
    departmentId: (doc.departmentId as string) || "",
    departmentName: (doc.departmentName as string) || "General",
    hireDate: (doc.hireDate as string) || "2024-01-01",
    baseSalary: Number(doc.baseSalary) || 0,
    status: (doc.status as "active" | "inactive") || "active",
    role: (doc.role as "employee" | "manager" | "hr_admin") || "employee",
    leaveAllowance: Number(doc.leaveAllowance) || 25,
    createdAt: doc.createdAt ? (doc.createdAt as Date).toISOString() : undefined,
    updatedAt: doc.updatedAt ? (doc.updatedAt as Date).toISOString() : undefined,
  };
}

export async function getEmployeeByEmail(email: string): Promise<Employee | null> {
  const db = await getDb();
  const normalized = email.toLowerCase().trim();
  const doc = await db.collection("employees").findOne({ email: normalized });
  if (!doc) return null;

  return {
    id: (doc._id as ObjectId).toString(),
    fullName: (doc.fullName as string) || (doc.name as string) || "Unnamed Staff",
    email: (doc.email as string) || "",
    phone: (doc.phone as string) || undefined,
    jobTitle: (doc.jobTitle as string) || "Staff Member",
    departmentId: (doc.departmentId as string) || "",
    departmentName: (doc.departmentName as string) || "General",
    hireDate: (doc.hireDate as string) || "2024-01-01",
    baseSalary: Number(doc.baseSalary) || 0,
    status: (doc.status as "active" | "inactive") || "active",
    role: (doc.role as "employee" | "manager" | "hr_admin") || "employee",
    leaveAllowance: Number(doc.leaveAllowance) || 25,
    createdAt: doc.createdAt ? (doc.createdAt as Date).toISOString() : undefined,
    updatedAt: doc.updatedAt ? (doc.updatedAt as Date).toISOString() : undefined,
  };
}

export async function createEmployee(data: EmployeeInput): Promise<Employee & { tempPassword: string }> {
  const db = await getDb();
  const normalizedEmail = data.email.toLowerCase().trim();

  const existing = await db.collection("employees").findOne({ email: normalizedEmail });
  if (existing) {
    throw new Error(`An employee with email "${normalizedEmail}" already exists.`);
  }

  let deptName = "General";
  if (ObjectId.isValid(data.departmentId)) {
    const dept = await db.collection("departments").findOne({ _id: new ObjectId(data.departmentId) });
    if (dept) deptName = dept.name as string;
  }

  await ensureJobTitle(data.jobTitle, data.departmentId, false);

  const newDoc = {
    fullName: data.fullName.trim(),
    email: normalizedEmail,
    phone: data.phone?.trim() || "",
    jobTitle: data.jobTitle.trim(),
    departmentId: data.departmentId,
    departmentName: deptName,
    hireDate: data.hireDate,
    baseSalary: data.baseSalary,
    role: data.role,
    status: data.status,
    leaveAllowance: data.leaveAllowance,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await db.collection("employees").insertOne(newDoc);

  // Auto-provision a users account for the new employee
  const tempPassword = crypto.randomBytes(9).toString("base64url").slice(0, 12);
  const hashedPassword = await bcrypt.hash(tempPassword, 12);
  await db.collection("users").updateOne(
    { email: normalizedEmail },
    {
      $setOnInsert: {
        email: normalizedEmail,
        name: data.fullName.trim(),
        password: hashedPassword,
        status: "active",
        forcePasswordReset: true,
        emailVerified: new Date(), // skip email verification for HR-provisioned accounts
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );

  return {
    id: result.insertedId.toString(),
    fullName: newDoc.fullName,
    email: newDoc.email,
    phone: newDoc.phone || undefined,
    jobTitle: newDoc.jobTitle,
    departmentId: newDoc.departmentId,
    departmentName: newDoc.departmentName,
    hireDate: newDoc.hireDate,
    baseSalary: newDoc.baseSalary,
    role: newDoc.role,
    status: newDoc.status,
    leaveAllowance: newDoc.leaveAllowance,
    createdAt: newDoc.createdAt.toISOString(),
    updatedAt: newDoc.updatedAt.toISOString(),
    tempPassword, // shown once to HR admin
  };
}

export async function updateEmployee(id: string, data: EmployeeInput): Promise<Employee> {
  const db = await getDb();
  if (!ObjectId.isValid(id)) {
    throw new Error("Invalid employee ID.");
  }
  const objId = new ObjectId(id);
  const normalizedEmail = data.email.toLowerCase().trim();

  const existingWithEmail = await db.collection("employees").findOne({
    _id: { $ne: objId },
    email: normalizedEmail,
  });
  if (existingWithEmail) {
    throw new Error(`An employee with email "${normalizedEmail}" already exists.`);
  }

  let deptName = "General";
  if (ObjectId.isValid(data.departmentId)) {
    const dept = await db.collection("departments").findOne({ _id: new ObjectId(data.departmentId) });
    if (dept) deptName = dept.name as string;
  }

  await ensureJobTitle(data.jobTitle, data.departmentId, false);

  const updateFields = {
    fullName: data.fullName.trim(),
    email: normalizedEmail,
    phone: data.phone?.trim() || "",
    jobTitle: data.jobTitle.trim(),
    departmentId: data.departmentId,
    departmentName: deptName,
    hireDate: data.hireDate,
    baseSalary: data.baseSalary,
    role: data.role,
    status: data.status,
    leaveAllowance: data.leaveAllowance,
    updatedAt: new Date(),
  };

  await db.collection("employees").updateOne({ _id: objId }, { $set: updateFields });

  const updated = await getEmployeeById(id);
  if (!updated) {
    throw new Error("Employee not found after update.");
  }
  return updated;
}

export async function toggleEmployeeStatus(id: string): Promise<{ id: string; newStatus: "active" | "inactive" }> {
  const db = await getDb();
  if (!ObjectId.isValid(id)) {
    throw new Error("Invalid employee ID.");
  }
  const objId = new ObjectId(id);

  const emp = await db.collection("employees").findOne({ _id: objId });
  if (!emp) {
    throw new Error("Employee not found.");
  }

  const newStatus: "active" | "inactive" = emp.status === "active" ? "inactive" : "active";
  await db.collection("employees").updateOne(
    { _id: objId },
    { $set: { status: newStatus, updatedAt: new Date() } }
  );

  return { id, newStatus };
}

export async function getHRDashboardStats(): Promise<HRDashboardStats> {
  const db = await getDb();
  await seedHrDefaults();

  const [employees, departments, jobTitles] = await Promise.all([
    db.collection("employees").find().toArray(),
    db.collection("departments").countDocuments(),
    db.collection("job_titles").countDocuments(),
  ]);

  const total = employees.length;
  let active = 0;
  let salarySum = 0;

  employees.forEach((e) => {
    if (e.status === "active") {
      active++;
      salarySum += Number(e.baseSalary) || 0;
    }
  });

  const inactive = total - active;
  const avgSalary = active > 0 ? Math.round(salarySum / active) : 0;

  return {
    totalEmployees: total,
    activeEmployees: active,
    inactiveEmployees: inactive,
    departmentCount: departments,
    jobTitleCount: jobTitles,
    averageSalary: avgSalary,
    monthlyPayrollGross: salarySum,
  };
}

// ==========================================
// Feature 2: Leave & Time-off Service Methods
// ==========================================

export async function getLeaveBalance(employeeId: string, year = new Date().getFullYear()): Promise<LeaveBalance> {
  const db = await getDb();
  const emp = await getEmployeeById(employeeId);
  const employeeName = emp?.fullName || "Employee";
  const allowance = emp?.leaveAllowance ?? 25;

  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const approvedLeaves = await db
    .collection("leave_requests")
    .find({
      employeeId,
      status: "approved",
      startDate: { $gte: yearStart, $lte: yearEnd },
    })
    .toArray();

  let usedPaidDays = 0;
  let unpaidDaysTaken = 0;

  approvedLeaves.forEach((leave) => {
    const days = Number(leave.days) || 0;
    if (leave.isPaid) {
      usedPaidDays += days;
    } else {
      unpaidDaysTaken += days;
    }
  });

  const remainingDays = Math.max(0, allowance - usedPaidDays);

  return {
    employeeId,
    employeeName,
    year,
    allowance,
    usedPaidDays,
    remainingDays,
    unpaidDaysTaken,
  };
}

export async function getLeaveRequests(filter: { employeeId?: string; status?: string } = {}): Promise<LeaveRequest[]> {
  const db = await getDb();
  await seedHrDefaults();

  const query: Record<string, unknown> = {};
  if (filter.employeeId) {
    query.employeeId = filter.employeeId;
  }
  if (filter.status && filter.status !== "all") {
    query.status = filter.status;
  }

  const docs = await db.collection("leave_requests").find(query).sort({ createdAt: -1 }).toArray();

  return docs.map((doc) => ({
    id: (doc._id as ObjectId).toString(),
    employeeId: doc.employeeId as string,
    employeeName: (doc.employeeName as string) || "Staff",
    departmentName: (doc.departmentName as string) || "General",
    leaveType: doc.leaveType as LeaveType,
    isPaid: Boolean(doc.isPaid),
    startDate: doc.startDate as string,
    endDate: doc.endDate as string,
    days: Number(doc.days) || 1,
    reason: doc.reason as string,
    status: doc.status as LeaveStatus,
    adminComment: doc.adminComment as string | undefined,
    reviewedBy: doc.reviewedBy as string | undefined,
    reviewedAt: doc.reviewedAt ? (doc.reviewedAt as Date).toISOString() : undefined,
    createdAt: doc.createdAt ? (doc.createdAt as Date).toISOString() : new Date().toISOString(),
    updatedAt: doc.updatedAt ? (doc.updatedAt as Date).toISOString() : undefined,
  }));
}

export async function createLeaveRequest(data: LeaveRequestInput): Promise<LeaveRequest> {
  const db = await getDb();
  const emp = await getEmployeeById(data.employeeId);
  if (!emp) {
    throw new Error("Employee not found.");
  }

  const days = calculateBusinessDays(data.startDate, data.endDate);
  if (days <= 0) {
    throw new Error("Calculated duration cannot be zero working days.");
  }

  // Check overlapping requests
  const overlap = await db.collection("leave_requests").findOne({
    employeeId: data.employeeId,
    status: { $in: ["approved", "pending"] },
    $or: [
      { startDate: { $lte: data.endDate }, endDate: { $gte: data.startDate } },
    ],
  });

  if (overlap) {
    throw new Error(
      `An existing ${overlap.status} leave request already overlaps with dates ${data.startDate} to ${data.endDate}.`
    );
  }

  // Determine if paid or unpaid based on leaveType
  const isPaid = data.leaveType === "unpaid" ? false : (data.isPaid ?? true);

  if (isPaid) {
    const currentYear = new Date(data.startDate).getFullYear();
    const balance = await getLeaveBalance(data.employeeId, currentYear);
    if (days > balance.remainingDays) {
      throw new Error(
        `Requested duration (${days} days) exceeds available annual leave balance (${balance.remainingDays} days remaining of ${balance.allowance}). Submit as unpaid leave or reduce duration.`
      );
    }
  }

  const doc = {
    employeeId: data.employeeId,
    employeeName: emp.fullName,
    departmentName: emp.departmentName,
    leaveType: data.leaveType,
    isPaid,
    startDate: data.startDate,
    endDate: data.endDate,
    days,
    reason: data.reason.trim(),
    status: "pending" as LeaveStatus,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const res = await db.collection("leave_requests").insertOne(doc);

  return {
    id: res.insertedId.toString(),
    employeeId: doc.employeeId,
    employeeName: doc.employeeName,
    departmentName: doc.departmentName,
    leaveType: doc.leaveType as LeaveType,
    isPaid: doc.isPaid,
    startDate: doc.startDate,
    endDate: doc.endDate,
    days: doc.days,
    reason: doc.reason,
    status: doc.status,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function reviewLeaveRequest(
  input: LeaveReviewInput,
  reviewerName = "HR Administrator"
): Promise<LeaveRequest> {
  const db = await getDb();
  if (!ObjectId.isValid(input.requestId)) {
    throw new Error("Invalid leave request ID.");
  }
  const objId = new ObjectId(input.requestId);

  const existing = await db.collection("leave_requests").findOne({ _id: objId });
  if (!existing) {
    throw new Error("Leave request not found.");
  }

  const newStatus: LeaveStatus = input.action === "approve" ? "approved" : "rejected";

  await db.collection("leave_requests").updateOne(
    { _id: objId },
    {
      $set: {
        status: newStatus,
        adminComment: input.adminComment?.trim() || undefined,
        reviewedBy: reviewerName,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      },
    }
  );

  const updated = await db.collection("leave_requests").findOne({ _id: objId });
  if (!updated) throw new Error("Could not load updated leave request.");

  return {
    id: updated._id.toString(),
    employeeId: updated.employeeId as string,
    employeeName: updated.employeeName as string,
    departmentName: updated.departmentName as string,
    leaveType: updated.leaveType as LeaveType,
    isPaid: Boolean(updated.isPaid),
    startDate: updated.startDate as string,
    endDate: updated.endDate as string,
    days: Number(updated.days) || 1,
    reason: updated.reason as string,
    status: updated.status as LeaveStatus,
    adminComment: updated.adminComment as string | undefined,
    reviewedBy: updated.reviewedBy as string | undefined,
    reviewedAt: updated.reviewedAt ? (updated.reviewedAt as Date).toISOString() : undefined,
    createdAt: (updated.createdAt as Date).toISOString(),
    updatedAt: (updated.updatedAt as Date).toISOString(),
  };
}

// ==========================================
// Feature 3: Attendance Tracking Service Methods
// ==========================================

export async function getTodayAttendance(): Promise<TodayAttendanceSummary> {
  const db = await getDb();
  await seedHrDefaults();

  const todayStr = formatDateYMD(new Date());

  const [activeEmployees, records] = await Promise.all([
    db.collection("employees").find({ status: "active" }).toArray(),
    db.collection("attendance").find({ date: todayStr }).sort({ checkIn: -1 }).toArray(),
  ]);

  const activeEmpMap = new Map<string, string>();
  activeEmployees.forEach((e) => activeEmpMap.set((e._id as ObjectId).toString(), e.fullName as string));

  // Deduplicate by employeeId to guarantee each employee appears AT MOST ONCE in today's roster
  const latestByEmployee = new Map<string, (typeof records)[0]>();
  for (const doc of records) {
    const empId = doc.employeeId as string;
    if (!latestByEmployee.has(empId)) {
      latestByEmployee.set(empId, doc);
    }
  }
  const deduplicatedRecords = Array.from(latestByEmployee.values());

  const attendanceRecords: AttendanceRecord[] = deduplicatedRecords.map((doc) => ({
    id: (doc._id as ObjectId).toString(),
    employeeId: doc.employeeId as string,
    employeeName: (doc.employeeName as string) || activeEmpMap.get(doc.employeeId) || "Staff",
    departmentName: (doc.departmentName as string) || "General",
    date: doc.date as string,
    checkIn: (doc.checkIn as Date).toISOString(),
    checkOut: doc.checkOut ? (doc.checkOut as Date).toISOString() : undefined,
    hoursWorked: Number(doc.hoursWorked) || 0,
    status: (doc.status as "present" | "checked_out") || "present",
    createdAt: doc.createdAt ? (doc.createdAt as Date).toISOString() : new Date().toISOString(),
  }));

  const presentCount = attendanceRecords.filter((r) => r.status === "present").length;
  const checkedOutCount = attendanceRecords.filter((r) => r.status === "checked_out").length;
  const totalActive = activeEmployees.length;
  const loggedIds = new Set(attendanceRecords.map((r) => r.employeeId));
  const absentCount = Math.max(0, totalActive - loggedIds.size);

  return {
    totalActive,
    presentCount,
    checkedOutCount,
    absentCount,
    records: attendanceRecords,
  };
}

export async function getEmployeeTodayAttendance(employeeId: string): Promise<AttendanceRecord | null> {
  const db = await getDb();
  const todayStr = formatDateYMD(new Date());
  const doc = await db.collection("attendance").findOne({ employeeId, date: todayStr });
  if (!doc) return null;

  return {
    id: (doc._id as ObjectId).toString(),
    employeeId: doc.employeeId as string,
    employeeName: doc.employeeName as string,
    departmentName: doc.departmentName as string,
    date: doc.date as string,
    checkIn: (doc.checkIn as Date).toISOString(),
    checkOut: doc.checkOut ? (doc.checkOut as Date).toISOString() : undefined,
    hoursWorked: Number(doc.hoursWorked) || 0,
    status: doc.status as "present" | "checked_out",
    createdAt: (doc.createdAt as Date).toISOString(),
  };
}

export async function checkInEmployee(employeeId: string): Promise<AttendanceRecord> {
  const db = await getDb();
  const todayStr = formatDateYMD(new Date());

  const emp = await getEmployeeById(employeeId);
  if (!emp) throw new Error("Employee not found.");

  const existing = await db.collection("attendance").findOne({ employeeId, date: todayStr });
  if (existing) {
    if (existing.status === "present") {
      throw new Error(`You are already checked in for today (${todayStr}).`);
    } else {
      throw new Error(`You have already completed attendance for today and checked out.`);
    }
  }

  const now = new Date();
  const newRecord = {
    employeeId,
    employeeName: emp.fullName,
    departmentName: emp.departmentName,
    date: todayStr,
    checkIn: now,
    checkOut: null,
    hoursWorked: 0,
    status: "present",
    createdAt: now,
    updatedAt: now,
  };

  const res = await db.collection("attendance").insertOne(newRecord);

  return {
    id: res.insertedId.toString(),
    employeeId: newRecord.employeeId,
    employeeName: newRecord.employeeName,
    departmentName: newRecord.departmentName,
    date: newRecord.date,
    checkIn: newRecord.checkIn.toISOString(),
    hoursWorked: 0,
    status: "present",
    createdAt: newRecord.createdAt.toISOString(),
  };
}

export async function checkOutEmployee(employeeId: string): Promise<AttendanceRecord> {
  const db = await getDb();
  const todayStr = formatDateYMD(new Date());

  const existing = await db.collection("attendance").findOne({ employeeId, date: todayStr });
  if (!existing) {
    throw new Error("Cannot check out without checking in first today.");
  }

  if (existing.status === "checked_out") {
    throw new Error("You have already checked out for today.");
  }

  const checkOutTime = new Date();
  const checkInTime = new Date(existing.checkIn);
  const diffHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
  const roundedHours = Math.round(Math.max(0.1, diffHours) * 10) / 10;

  await db.collection("attendance").updateOne(
    { _id: existing._id },
    {
      $set: {
        checkOut: checkOutTime,
        hoursWorked: roundedHours,
        status: "checked_out",
        updatedAt: checkOutTime,
      },
    }
  );

  return {
    id: existing._id.toString(),
    employeeId: existing.employeeId as string,
    employeeName: existing.employeeName as string,
    departmentName: existing.departmentName as string,
    date: existing.date as string,
    checkIn: (existing.checkIn as Date).toISOString(),
    checkOut: checkOutTime.toISOString(),
    hoursWorked: roundedHours,
    status: "checked_out",
    createdAt: (existing.createdAt as Date).toISOString(),
  };
}

export async function getAttendanceHistory(filter: {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
} = {}): Promise<AttendanceRecord[]> {
  const db = await getDb();
  const query: Record<string, unknown> = {};

  if (filter.employeeId) query.employeeId = filter.employeeId;
  if (filter.startDate || filter.endDate) {
    query.date = {};
    if (filter.startDate) (query.date as Record<string, unknown>).$gte = filter.startDate;
    if (filter.endDate) (query.date as Record<string, unknown>).$lte = filter.endDate;
  }

  const docs = await db.collection("attendance").find(query).sort({ date: -1, checkIn: -1 }).toArray();

  return docs.map((doc) => ({
    id: (doc._id as ObjectId).toString(),
    employeeId: doc.employeeId as string,
    employeeName: doc.employeeName as string,
    departmentName: doc.departmentName as string,
    date: doc.date as string,
    checkIn: (doc.checkIn as Date).toISOString(),
    checkOut: doc.checkOut ? (doc.checkOut as Date).toISOString() : undefined,
    hoursWorked: Number(doc.hoursWorked) || 0,
    status: doc.status as "present" | "checked_out",
    createdAt: (doc.createdAt as Date).toISOString(),
  }));
}

// ==========================================
// Feature 4: Payroll Generator Service Methods
// ==========================================

export async function calculateEmployeePayrollPreview(
  employeeId: string,
  period: string, // YYYY-MM
  workingDaysInMonth = 22
) {
  const db = await getDb();
  const emp = await getEmployeeById(employeeId);
  if (!emp) throw new Error("Employee not found.");

  // Find all approved unpaid leaves overlapping this month
  const monthStart = `${period}-01`;
  const [yearStr, monthNum] = period.split("-");
  const lastDayOfMonth = new Date(Number(yearStr), Number(monthNum), 0).getDate();
  const monthEnd = `${period}-${String(lastDayOfMonth).padStart(2, "0")}`;

  const unpaidLeaves = await db
    .collection("leave_requests")
    .find({
      employeeId,
      status: "approved",
      isPaid: false,
      $or: [
        { startDate: { $gte: monthStart, $lte: monthEnd } },
        { endDate: { $gte: monthStart, $lte: monthEnd } },
      ],
    })
    .toArray();

  let unpaidLeaveDays = 0;
  unpaidLeaves.forEach((leave) => {
    // Clamp to current period if spans across months
    const s = leave.startDate < monthStart ? monthStart : leave.startDate;
    const e = leave.endDate > monthEnd ? monthEnd : leave.endDate;
    unpaidLeaveDays += calculateBusinessDays(s, e);
  });

  const baseSalary = emp.baseSalary;
  const dailyRate = Math.round((baseSalary / workingDaysInMonth) * 100) / 100;
  const deduction = Math.round((dailyRate * unpaidLeaveDays) * 100) / 100;
  const netSalary = Math.max(0, Math.round((baseSalary - deduction) * 100) / 100);

  return {
    employee: emp,
    period,
    baseSalary,
    workingDaysInMonth,
    dailyRate,
    unpaidLeaveDays,
    deduction,
    netSalary,
    currency: "TND",
  };
}

export async function generatePayslips(
  period: string,
  employeeIds?: string[],
  workingDaysInMonth = 22
): Promise<PayslipRecord[]> {
  const db = await getDb();
  const query: Record<string, unknown> = { status: "active" };
  if (employeeIds && employeeIds.length > 0) {
    query._id = { $in: employeeIds.map((id) => new ObjectId(id)) };
  }

  const activeEmployees = await db.collection("employees").find(query).toArray();
  const generated: PayslipRecord[] = [];

  for (const doc of activeEmployees) {
    const empId = (doc._id as ObjectId).toString();
    const calculation = await calculateEmployeePayrollPreview(empId, period, workingDaysInMonth);

    const payslipDoc = {
      employeeId: empId,
      employeeName: calculation.employee.fullName,
      jobTitle: calculation.employee.jobTitle,
      departmentName: calculation.employee.departmentName,
      period,
      baseSalary: calculation.baseSalary,
      workingDaysInMonth: calculation.workingDaysInMonth,
      dailyRate: calculation.dailyRate,
      unpaidLeaveDays: calculation.unpaidLeaveDays,
      deduction: calculation.deduction,
      netSalary: calculation.netSalary,
      currency: "TND",
      status: "generated" as const,
      generatedAt: new Date(),
    };

    // Upsert payslip for same employee & period to avoid duplicates
    const res = await db.collection("payslips").findOneAndUpdate(
      { employeeId: empId, period },
      { $set: payslipDoc },
      { upsert: true, returnDocument: "after" }
    );

    const payslipId = res && "_id" in res && res._id ? (res._id as ObjectId).toString() : empId;
    generated.push({
      id: payslipId,
      employeeId: payslipDoc.employeeId,
      employeeName: payslipDoc.employeeName,
      jobTitle: payslipDoc.jobTitle,
      departmentName: payslipDoc.departmentName,
      period: payslipDoc.period,
      baseSalary: payslipDoc.baseSalary,
      workingDaysInMonth: payslipDoc.workingDaysInMonth,
      dailyRate: payslipDoc.dailyRate,
      unpaidLeaveDays: payslipDoc.unpaidLeaveDays,
      deduction: payslipDoc.deduction,
      netSalary: payslipDoc.netSalary,
      currency: payslipDoc.currency,
      status: payslipDoc.status,
      generatedAt: (payslipDoc.generatedAt as Date).toISOString(),
    });
  }

  return generated;
}

export async function getPayslips(filter: { period?: string; employeeId?: string } = {}): Promise<PayslipRecord[]> {
  const db = await getDb();
  const query: Record<string, unknown> = {};

  if (filter.period) query.period = filter.period;
  if (filter.employeeId) query.employeeId = filter.employeeId;

  const docs = await db.collection("payslips").find(query).sort({ employeeName: 1 }).toArray();

  return docs.map((doc) => ({
    id: (doc._id as ObjectId).toString(),
    employeeId: doc.employeeId as string,
    employeeName: doc.employeeName as string,
    jobTitle: doc.jobTitle as string,
    departmentName: doc.departmentName as string,
    period: doc.period as string,
    baseSalary: Number(doc.baseSalary) || 0,
    workingDaysInMonth: Number(doc.workingDaysInMonth) || 22,
    dailyRate: Number(doc.dailyRate) || 0,
    unpaidLeaveDays: Number(doc.unpaidLeaveDays) || 0,
    deduction: Number(doc.deduction) || 0,
    netSalary: Number(doc.netSalary) || 0,
    currency: (doc.currency as string) || "TND",
    status: (doc.status as "generated" | "paid") || "generated",
    generatedAt: doc.generatedAt ? (doc.generatedAt as Date).toISOString() : new Date().toISOString(),
  }));
}

export async function getPayslipById(id: string): Promise<PayslipRecord | null> {
  const db = await getDb();
  if (!ObjectId.isValid(id)) return null;

  const doc = await db.collection("payslips").findOne({ _id: new ObjectId(id) });
  if (!doc) return null;

  return {
    id: (doc._id as ObjectId).toString(),
    employeeId: doc.employeeId as string,
    employeeName: doc.employeeName as string,
    jobTitle: doc.jobTitle as string,
    departmentName: doc.departmentName as string,
    period: doc.period as string,
    baseSalary: Number(doc.baseSalary) || 0,
    workingDaysInMonth: Number(doc.workingDaysInMonth) || 22,
    dailyRate: Number(doc.dailyRate) || 0,
    unpaidLeaveDays: Number(doc.unpaidLeaveDays) || 0,
    deduction: Number(doc.deduction) || 0,
    netSalary: Number(doc.netSalary) || 0,
    currency: (doc.currency as string) || "TND",
    status: (doc.status as "generated" | "paid") || "generated",
    generatedAt: doc.generatedAt ? (doc.generatedAt as Date).toISOString() : new Date().toISOString(),
  };
}

export async function getPayrollSummary(period: string): Promise<PayrollSummary> {
  const payslips = await getPayslips({ period });
  const totalEmployees = await (await getDb()).collection("employees").countDocuments({ status: "active" });

  let totalGross = 0;
  let totalDeductions = 0;
  let totalNet = 0;

  payslips.forEach((p) => {
    totalGross += p.baseSalary;
    totalDeductions += p.deduction;
    totalNet += p.netSalary;
  });

  return {
    period,
    totalGross: Math.round(totalGross * 100) / 100,
    totalDeductions: Math.round(totalDeductions * 100) / 100,
    totalNet: Math.round(totalNet * 100) / 100,
    totalEmployees,
    payslipsGenerated: payslips.length,
  };
}

// ==========================================
// Feature 5: AI HR Assistant Engine
// ==========================================

export async function askHRAssistant(promptText: string, employeeId: string): Promise<AIChatMessage> {
  const query = promptText.trim().toLowerCase();
  const emp = await getEmployeeById(employeeId);
  const employeeName = emp?.fullName || "Employee";

  const messageId = "msg-" + Date.now();
  const timestamp = new Date().toISOString();

  // 1. Tool check: Leave balance query
  const isLeaveBalanceQuery =
    query.includes("leave balance") ||
    query.includes("days do i have") ||
    query.includes("remaining leave") ||
    query.includes("how many days") ||
    query.includes("vacation days") ||
    query.includes("balance");

  if (isLeaveBalanceQuery) {
    const currentYear = new Date().getFullYear();
    const balance = await getLeaveBalance(employeeId, currentYear);
    const myRequests = await getLeaveRequests({ employeeId });
    const pendingCount = myRequests.filter((r) => r.status === "pending").length;

    let responseContent = `Hello **${employeeName}**, here is your real-time leave balance for **${currentYear}**:\n\n`;
    responseContent += `- **Annual Allowance**: ${balance.allowance} paid days\n`;
    responseContent += `- **Approved Paid Leave Used**: ${balance.usedPaidDays} days\n`;
    responseContent += `- **Available Balance**: **${balance.remainingDays} days** remaining\n`;
    if (balance.unpaidDaysTaken > 0) {
      responseContent += `- **Unpaid Leave Taken**: ${balance.unpaidDaysTaken} days (deducted in payroll)\n`;
    }
    if (pendingCount > 0) {
      responseContent += `\n*Note*: You currently have **${pendingCount} pending request(s)** awaiting admin review.`;
    }
    responseContent += `\n\n> *Tip*: To submit a new request, open the **Time-Off & Leave** tab and click **Request Leave**.`;

    return {
      id: messageId,
      role: "assistant",
      content: responseContent,
      timestamp,
      toolData: {
        type: "leave_balance",
        data: {
          allowance: balance.allowance,
          usedPaidDays: balance.usedPaidDays,
          remainingDays: balance.remainingDays,
          unpaidDaysTaken: balance.unpaidDaysTaken,
        },
      },
    };
  }

  // 2. Tool check: Unpaid leave deduction & Payroll calculation formula
  const isPayrollDeductionQuery =
    query.includes("unpaid") ||
    query.includes("deduct") ||
    query.includes("salary") ||
    query.includes("formula") ||
    query.includes("payroll");

  if (isPayrollDeductionQuery) {
    const baseSalary = emp?.baseSalary ?? 3500;
    const dailyRate = Math.round((baseSalary / 22) * 100) / 100;

    let responseContent = `### AnOps Salary & Unpaid Leave Deduction Formula\n\n`;
    responseContent += `Yes, **unpaid leave is directly deducted from your monthly salary**.\n\n`;
    responseContent += `The company applies the following standard formula:\n`;
    responseContent += `\`\`\`text\n`;
    responseContent += `daily_rate  = base_salary / 22 working days\n`;
    responseContent += `deduction   = daily_rate * unpaid_leave_days\n`;
    responseContent += `net_salary  = base_salary - deduction\n`;
    responseContent += `\`\`\`\n\n`;
    responseContent += `**Your Personalized Example** (based on your contract base of **${baseSalary.toLocaleString()} TND**):\n`;
    responseContent += `- Your daily rate is **${dailyRate.toFixed(2)} TND / day**.\n`;
    responseContent += `- If you take **1 unpaid day**, your deduction is **${dailyRate.toFixed(2)} TND**.\n`;
    responseContent += `- If you take **2 unpaid days**, your deduction is **${(dailyRate * 2).toFixed(2)} TND**.\n\n`;
    responseContent += `*Policy Citation: AnOps Payroll & Compensation Guidelines (Section 2).*`;

    return {
      id: messageId,
      role: "assistant",
      content: responseContent,
      timestamp,
      toolData: {
        type: "payroll_calculation",
        data: { baseSalary, dailyRate, workingDays: 22 },
      },
    };
  }

  // 3. Sick leave / medical procedure query
  if (query.includes("sick") || query.includes("doctor") || query.includes("illness") || query.includes("medical")) {
    const sickPolicy = COMPANY_POLICIES.find((p) => p.id === "policy-leave-sick-unpaid");
    let responseContent = `### AnOps Sick Leave Guidelines & Procedure\n\n`;
    responseContent += `1. **Entitlement**: Employees are entitled to up to **10 days of paid sick leave** per year.\n`;
    responseContent += `2. **Notice**: Please notify your manager and HR by **9:00 AM** on the morning of absence.\n`;
    responseContent += `3. **Medical Certificate**: Required for any absence exceeding **2 consecutive business days**. It must be submitted to HR within 48 hours of return.\n`;
    responseContent += `4. **Submission**: Log into the HR Portal -> **Time-Off & Leave** -> Choose Leave Type **Sick Leave**.\n\n`;
    responseContent += `*Policy Citation: Sick Leave, Unpaid Leave & Special Absence Policy.*`;

    return {
      id: messageId,
      role: "assistant",
      content: responseContent,
      timestamp,
      toolData: {
        type: "policy_excerpt",
        data: { policyId: sickPolicy?.id, title: sickPolicy?.title },
      },
    };
  }

  // 4. Working hours & attendance punch query
  if (
    query.includes("working hour") ||
    query.includes("hours") ||
    query.includes("attendance") ||
    query.includes("check-in") ||
    query.includes("punch") ||
    query.includes("arrival") ||
    query.includes("late")
  ) {
    const todayRec = await getEmployeeTodayAttendance(employeeId);
    let responseContent = `### AnOps Working Hours & Attendance Policy\n\n`;
    responseContent += `- **Standard Work Week**: 40 hours per week, Monday through Friday.\n`;
    responseContent += `- **Standard Schedule**: 8:00 AM to 5:00 PM (includes 1-hour lunch break).\n`;
    responseContent += `- **Flexible Arrival Window**: You may arrive between **8:30 AM and 9:30 AM** (adjusted shift ends between 5:30 PM and 6:30 PM).\n`;
    responseContent += `- **Punch System**: You must record attendance daily using the **HR Punch Clock**.\n\n`;

    if (todayRec) {
      responseContent += `**Your Status Today (${todayRec.date})**:\n`;
      responseContent += `- Checked In: **${new Date(todayRec.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}**\n`;
      if (todayRec.checkOut) {
        responseContent += `- Checked Out: **${new Date(todayRec.checkOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}** (${todayRec.hoursWorked} hrs logged)\n`;
      } else {
        responseContent += `- Currently **Active / Present**.\n`;
      }
    } else {
      responseContent += `> *Notice*: You haven't checked in yet today. Head over to the **Attendance** tab to punch in!`;
    }

    return {
      id: messageId,
      role: "assistant",
      content: responseContent,
      timestamp,
      toolData: {
        type: "attendance",
        data: { todayRecord: todayRec },
      },
    };
  }

  // 5. Maternity / Paternity / Bereavement
  if (query.includes("maternity") || query.includes("paternity") || query.includes("bereavement") || query.includes("death")) {
    let responseContent = `### AnOps Special Family Leave Allowances\n\n`;
    responseContent += `- **Maternity Leave**: **60 calendar days** fully paid.\n`;
    responseContent += `- **Paternity Leave**: **5 business days** fully paid upon child birth.\n`;
    responseContent += `- **Bereavement Leave**: **3 business days** fully paid for immediate family members (spouse, child, parent, sibling).\n\n`;
    responseContent += `To apply, submit a request under **Time-Off & Leave** and select the corresponding leave category.`;

    return {
      id: messageId,
      role: "assistant",
      content: responseContent,
      timestamp,
    };
  }

  // 6. Generic policy search / RAG across COMPANY_POLICIES
  const matches = COMPANY_POLICIES.filter(
    (p) =>
      p.title.toLowerCase().includes(query) ||
      p.summary.toLowerCase().includes(query) ||
      p.content.toLowerCase().includes(query)
  );

  if (matches.length > 0) {
    const topMatch = matches[0];
    let responseContent = `### ${topMatch.title}\n\n${topMatch.summary}\n\n`;
    const snippet = topMatch.content.split("\n").slice(2, 12).join("\n");
    responseContent += snippet + "\n\n";
    responseContent += `*Source: AnOps HR Knowledge Base (${topMatch.title}).*`;

    return {
      id: messageId,
      role: "assistant",
      content: responseContent,
      timestamp,
      toolData: {
        type: "policy_excerpt",
        data: { policyId: topMatch.id, title: topMatch.title },
      },
    };
  }

  // 7. Strict Guardrail: Safe refusal for unknown or out-of-scope questions
  const safeRefusal =
    `I don't have enough verified HR policy information to answer that accurately. ` +
    `Please contact the HR Department directly at **hr@anops.internal** or check with your manager.\n\n` +
    `*Guardrail Note: As your AI HR Assistant, I only provide answers strictly grounded in official AnOps company policies and your verified personnel records.*`;

  return {
    id: messageId,
    role: "assistant",
    content: safeRefusal,
    timestamp,
  };
}
