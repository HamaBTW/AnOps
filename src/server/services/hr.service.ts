import "server-only";
import { ObjectId } from "mongodb";
import clientPromise from "@/server/db/client";
import type { Department, JobTitle, Employee, HRDashboardStats, EmployeeFilterParams } from "@/features/hr/types";
import type { EmployeeInput } from "@/features/hr/schemas/hr.schema";

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

/**
 * Initializes and seeds default HR records (departments, predefined titles, and demo employees)
 * if they do not exist yet.
 */
export async function seedHrDefaults(): Promise<void> {
  const db = await getDb();

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
}

/**
 * Fetch all departments with current active employee count
 */
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

/**
 * Create a new department
 */
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

/**
 * Update an existing department's name and/or description
 */
export async function updateDepartment(id: string, name: string, description?: string): Promise<Department> {
  const db = await getDb();
  if (!ObjectId.isValid(id)) throw new Error("Invalid department ID.");
  const objId = new ObjectId(id);
  const trimmed = name.trim();

  // Ensure no duplicate name (exclude itself)
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

  // Update all employees who belong to this department
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

/**
 * Delete a department — only allowed if no employees are assigned to it
 */
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

/**
 * Fetch employees belonging to a specific department
 */
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

/**
 * Update a custom job title's text and/or department association
 */
export async function updateJobTitle(id: string, title: string, departmentId?: string): Promise<JobTitle> {
  const db = await getDb();
  if (!ObjectId.isValid(id)) throw new Error("Invalid job title ID.");
  const objId = new ObjectId(id);

  const existing = await db.collection("job_titles").findOne({ _id: objId });
  if (!existing) throw new Error("Job title not found.");
  if (existing.isPredefined) throw new Error("Predefined job titles cannot be renamed.");

  const trimmed = title.trim();

  // Check for duplicate title
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

  // Update employees using the old title
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

/**
 * Fetch all job titles (predefined + custom), with active employee count
 */
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

/**
 * Ensure a job title exists in the job_titles collection.
 * If not present, creates it as a custom title so it becomes selectable.
 */
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

/**
 * Delete a custom job title (predefined titles are protected, and titles in use cannot be deleted)
 */
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

/**
 * Fetch employees with optional search, department filter, and status filter
 */
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

/**
 * Fetch single employee by ID
 */
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

/**
 * Create a new employee with unique email validation and automatic job title recording
 */
export async function createEmployee(data: EmployeeInput): Promise<Employee> {
  const db = await getDb();
  const normalizedEmail = data.email.toLowerCase().trim();

  // Check unique email
  const existing = await db.collection("employees").findOne({ email: normalizedEmail });
  if (existing) {
    throw new Error(`An employee with email "${normalizedEmail}" already exists.`);
  }

  // Get department name
  let deptName = "General";
  if (ObjectId.isValid(data.departmentId)) {
    const dept = await db.collection("departments").findOne({ _id: new ObjectId(data.departmentId) });
    if (dept) deptName = dept.name as string;
  }

  // Ensure job title is recorded
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
  };
}

/**
 * Update an existing employee
 */
export async function updateEmployee(id: string, data: EmployeeInput): Promise<Employee> {
  const db = await getDb();
  if (!ObjectId.isValid(id)) {
    throw new Error("Invalid employee ID.");
  }
  const objId = new ObjectId(id);

  const normalizedEmail = data.email.toLowerCase().trim();

  // Check unique email if changed
  const existingWithEmail = await db.collection("employees").findOne({
    _id: { $ne: objId },
    email: normalizedEmail,
  });
  if (existingWithEmail) {
    throw new Error(`An employee with email "${normalizedEmail}" already exists.`);
  }

  // Get department name
  let deptName = "General";
  if (ObjectId.isValid(data.departmentId)) {
    const dept = await db.collection("departments").findOne({ _id: new ObjectId(data.departmentId) });
    if (dept) deptName = dept.name as string;
  }

  // Ensure job title is recorded
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

/**
 * Soft-delete / toggle employee active status
 */
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

/**
 * Aggregate summary statistics for the HR Dashboard
 */
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
