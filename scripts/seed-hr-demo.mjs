#!/usr/bin/env node
/**
 * AnOps HR Demo Data Seeder
 * 
 * Injects a complete set of realistic HR & Leave Balance (Solde de Congé) demo records
 * to test every feature in manual-test.md:
 * 
 * 1. Sarah Ben Salem  -> Tests KPI cards (Earned, Taken, Reserved, Available)
 * 2. Youssef Trabelsi -> Tests Young Adult policy (1.5d/mo) & Pending Approval
 * 3. Amira Gharbi     -> Tests Single-day Half-day leave request (0.5d)
 * 4. Karim Mansour    -> Tests Offboarding / Departure Review modal
 * 5. Nour Khemir      -> Tests Payroll unpaid deduction regression (4,400 TND base)
 * 
 * Usage:
 *   node scripts/seed-hr-demo.mjs
 *   node scripts/seed-hr-demo.mjs --clean
 *   node scripts/seed-hr-demo.mjs --company <company_id>
 *   MONGODB_URI="mongodb+srv://..." node scripts/seed-hr-demo.mjs
 */

import { existsSync, readFileSync } from "node:fs";
import { MongoClient, ObjectId } from "mongodb";

// 1. Environment loading
if (!process.env.MONGODB_URI && existsSync(".env")) {
  const envContent = readFileSync(".env", "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("❌ MONGODB_URI is not set. Please provide it in .env or as an environment variable.");
  process.exit(1);
}

// 2. Parse CLI Arguments
const args = process.argv.slice(2);
const isClean = args.includes("--clean");
const companyArgIdx = args.indexOf("--company");
const targetCompanyId = companyArgIdx !== -1 ? args[companyArgIdx + 1] : null;

function formatDateYMD(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function run() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(client.options.dbName && client.options.dbName !== "test" ? client.options.dbName : "anops");
  console.log(`🔌 Connected to database: ${db.databaseName}`);

  // Find target company
  let company;
  if (targetCompanyId) {
    company = await db.collection("companies").findOne({ _id: new ObjectId(targetCompanyId) });
    if (!company) {
      console.error(`❌ Company with ID ${targetCompanyId} not found.`);
      await client.close();
      process.exit(1);
    }
  } else {
    // Pick first company found
    company = await db.collection("companies").findOne();
    if (!company) {
      console.error("❌ No company found in the database. Please create a company first or run onboarding.");
      await client.close();
      process.exit(1);
    }
  }

  const cId = company._id;
  console.log(`🏢 Target Company: "${company.name}" (ID: ${cId.toString()})`);

  // Handle --clean mode
  if (isClean) {
    console.log("🧹 Cleaning demo HR data...");
    const demoEmps = await db.collection("employees").find({ companyId: cId, isDemo: true }).toArray();
    const demoEmpIds = demoEmps.map((e) => e._id.toString());

    if (demoEmpIds.length > 0) {
      await db.collection("leave_requests").deleteMany({ companyId: cId, employeeId: { $in: demoEmpIds } });
      await db.collection("leave_transactions").deleteMany({ companyId: cId, employeeId: { $in: demoEmpIds } });
      await db.collection("employee_leave_policies").deleteMany({ companyId: cId, employeeId: { $in: demoEmpIds } });
      await db.collection("employees").deleteMany({ companyId: cId, isDemo: true });
    }
    console.log(`✅ Cleaned ${demoEmpIds.length} demo employee(s) and their associated records.`);
    await client.close();
    return;
  }

  // 1. Ensure Standard Departments
  console.log("\n📁 1. Ensuring Departments...");
  const deptDefs = [
    { name: "Engineering", description: "Software development and infrastructure" },
    { name: "Product & Design", description: "UI/UX design and product strategy" },
    { name: "Quality Assurance", description: "Automated testing and QA" },
    { name: "Sales & Marketing", description: "Revenue generation and growth" },
  ];

  const deptMap = {};
  for (const def of deptDefs) {
    let dept = await db.collection("departments").findOne({ companyId: cId, name: def.name });
    if (!dept) {
      const inserted = await db.collection("departments").insertOne({
        ...def,
        companyId: cId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      dept = { _id: inserted.insertedId, name: def.name };
      console.log(`   + Created department: ${def.name}`);
    }
    deptMap[def.name] = dept._id.toString();
  }

  // 2. Ensure Leave Types
  console.log("\n🏖️ 2. Ensuring Leave Types...");
  const typeDefs = [
    { name: "Annual Paid Leave", code: "CP", isPaid: true, requiresApproval: true, requiresDocument: false },
    { name: "Sick Leave", code: "SICK", isPaid: true, requiresApproval: true, requiresDocument: true },
    { name: "Special / Family Leave", code: "EXCEPTIONAL", isPaid: true, requiresApproval: true, requiresDocument: true },
    { name: "Unpaid Leave", code: "UNPAID", isPaid: false, requiresApproval: true, requiresDocument: false },
  ];

  const typeMap = {};
  for (const def of typeDefs) {
    let t = await db.collection("leave_types").findOne({ companyId: cId, code: def.code });
    if (!t) {
      const ins = await db.collection("leave_types").insertOne({
        ...def,
        isActive: true,
        companyId: cId,
        createdAt: new Date(),
      });
      t = { _id: ins.insertedId, code: def.code };
      console.log(`   + Created leave type: ${def.name} (${def.code})`);
    }
    typeMap[def.code] = t._id.toString();
  }

  // 3. Ensure Leave Policies (Tunisian Labour Code Art. 113-114)
  console.log("\n⚖️ 3. Ensuring Leave Policies...");
  const policyDefs = [
    {
      name: "Standard Adult Policy (Art. 113-114)",
      country: "TN",
      employeeCategory: "adult",
      accrualRate: 1.0,
      annualCap: 15,
      accrualPeriod: "monthly",
      legalReference: "Code du Travail Art. 113-114",
    },
    {
      name: "Young Adult Policy 18-20 ans (Art. 114)",
      country: "TN",
      employeeCategory: "young_adult",
      accrualRate: 1.5,
      annualCap: 22.5,
      accrualPeriod: "monthly",
      legalReference: "Code du Travail Art. 114",
    },
    {
      name: "Under 18 Policy (Art. 114)",
      country: "TN",
      employeeCategory: "under_18",
      accrualRate: 2.0,
      annualCap: 30,
      accrualPeriod: "monthly",
      legalReference: "Code du Travail Art. 114",
    },
  ];

  const policyMap = {};
  for (const def of policyDefs) {
    let p = await db.collection("leave_policies").findOne({ companyId: cId, employeeCategory: def.employeeCategory });
    if (!p) {
      const ins = await db.collection("leave_policies").insertOne({
        ...def,
        referencePeriodType: "calendar_year",
        calculationMethod: "standard_monthly",
        roundingRule: "half_day",
        effectiveFrom: "2024-01-01",
        isActive: true,
        companyId: cId,
        createdAt: new Date(),
      });
      p = { _id: ins.insertedId, name: def.name };
      console.log(`   + Created leave policy: ${def.name}`);
    }
    policyMap[def.employeeCategory] = p._id.toString();
  }

  // 4. Ensure Tunisian Public Holidays
  console.log("\n🇹🇳 4. Ensuring Public Holidays...");
  const currentYear = new Date().getFullYear();
  const holidays = [
    { name: "New Year's Day", date: `${currentYear}-01-01` },
    { name: "Revolution Day", date: `${currentYear}-01-14` },
    { name: "Independence Day", date: `${currentYear}-03-20` },
    { name: "Martyrs' Day", date: `${currentYear}-04-09` },
    { name: "Labour Day", date: `${currentYear}-05-01` },
    { name: "Republic Day", date: `${currentYear}-07-25` },
    { name: "Women's Day", date: `${currentYear}-08-13` },
    { name: "Evacuation Day", date: `${currentYear}-10-15` },
  ];

  for (const h of holidays) {
    const exists = await db.collection("public_holidays").findOne({ companyId: cId, date: h.date });
    if (!exists) {
      await db.collection("public_holidays").insertOne({
        ...h,
        isHalfDay: false,
        companyId: cId,
      });
    }
  }
  console.log(`   ✓ 8 Tunisian public holidays verified for ${currentYear}.`);

  // 5. Inject 5 Targeted Demo Employees
  console.log("\n👥 5. Injecting Demo Employees & Leave Records...");

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const demoEmployees = [
    {
      fullName: "Sarah Ben Salem",
      email: "sarah.bensalem@demo.anops.tn",
      phone: "+216 71 100 201",
      jobTitle: "Senior Software Engineer",
      departmentId: deptMap["Engineering"],
      departmentName: "Engineering",
      hireDate: "2026-05-01",
      dateOfBirth: "1994-06-15", // Adult (32 yo)
      baseSalary: 3800,
      role: "employee",
      status: "active",
      leaveAllowance: 12,
      category: "adult",
      scenario: "Full KPI showcase: Earned 7d, Taken 3d, Reserved 2d -> Available 2d",
    },
    {
      fullName: "Youssef Trabelsi",
      email: "youssef.trabelsi@demo.anops.tn",
      phone: "+216 71 100 202",
      jobTitle: "Junior UI Designer",
      departmentId: deptMap["Product & Design"],
      departmentName: "Product & Design",
      hireDate: "2026-08-01",
      dateOfBirth: "2007-02-10", // 19 yo -> young_adult (1.5d/mo)
      baseSalary: 2200,
      role: "employee",
      status: "active",
      leaveAllowance: 18,
      category: "young_adult",
      scenario: "Young Adult (1.5d/mo) + 1 pending leave request to test Approval",
    },
    {
      fullName: "Amira Gharbi",
      email: "amira.gharbi@demo.anops.tn",
      phone: "+216 71 100 203",
      jobTitle: "QA Engineer",
      departmentId: deptMap["Quality Assurance"],
      departmentName: "Quality Assurance",
      hireDate: "2026-04-01",
      dateOfBirth: "1998-11-20", // Adult
      baseSalary: 2800,
      role: "employee",
      status: "active",
      leaveAllowance: 12,
      category: "adult",
      scenario: "Has 1 pending single-day half-day request (0.5d)",
    },
    {
      fullName: "Karim Mansour",
      email: "karim.mansour@demo.anops.tn",
      phone: "+216 71 100 204",
      jobTitle: "Account Executive",
      departmentId: deptMap["Sales & Marketing"],
      departmentName: "Sales & Marketing",
      hireDate: "2025-11-01",
      dateOfBirth: "1991-04-12", // Adult
      baseSalary: 3200,
      role: "employee",
      status: "active",
      leaveAllowance: 12,
      category: "adult",
      scenario: "Ready for offboarding -> Click 'Deactivate' to test Departure Review modal",
    },
    {
      fullName: "Nour Khemir",
      email: "nour.khemir@demo.anops.tn",
      phone: "+216 71 100 205",
      jobTitle: "DevOps Engineer",
      departmentId: deptMap["Engineering"],
      departmentName: "Engineering",
      hireDate: "2026-01-15",
      dateOfBirth: "1993-09-08", // Adult
      baseSalary: 4400,
      role: "employee",
      status: "active",
      leaveAllowance: 12,
      category: "adult",
      scenario: "Has approved UNPAID leave (2d) -> Tests Payroll deduction (4400 - 400 = 4000 TND)",
    },
  ];

  for (const empData of demoEmployees) {
    const { category, scenario, ...empFields } = empData;

    // Upsert employee
    let emp = await db.collection("employees").findOne({ companyId: cId, email: empFields.email });
    if (!emp) {
      const ins = await db.collection("employees").insertOne({
        ...empFields,
        companyId: cId,
        isDemo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      emp = { _id: ins.insertedId, ...empFields };
      console.log(`\n   👤 Created: ${emp.fullName} (${emp.jobTitle})`);
    } else {
      await db.collection("employees").updateOne(
        { _id: emp._id },
        { $set: { ...empFields, isDemo: true, status: "active", updatedAt: new Date() } }
      );
      console.log(`\n   👤 Updated: ${emp.fullName} (${emp.jobTitle})`);
    }

    const empId = emp._id.toString();
    console.log(`      🎯 Scenario: ${scenario}`);

    // Assign policy
    await db.collection("employee_leave_policies").deleteMany({ companyId: cId, employeeId: empId });
    await db.collection("employee_leave_policies").insertOne({
      companyId: cId,
      employeeId: empId,
      leavePolicyId: policyMap[category] || policyMap["adult"],
      policyName: category === "young_adult" ? "Young Adult Policy 18-20 ans (Art. 114)" : "Standard Adult Policy (Art. 113-114)",
      effectiveFrom: emp.hireDate,
      assignedBy: "system_demo_seeder",
      assignedAt: new Date(),
    });

    // Clean existing leave records for this demo employee to make script idempotent
    await db.collection("leave_requests").deleteMany({ companyId: cId, employeeId: empId });
    await db.collection("leave_transactions").deleteMany({ companyId: cId, employeeId: empId });

    // Seed specific transactions & requests based on employee
    if (emp.fullName === "Sarah Ben Salem") {
      // 1. Initial Onboarding Accrual
      await db.collection("leave_transactions").insertOne({
        companyId: cId,
        employeeId: empId,
        employeeName: emp.fullName,
        leaveTypeId: typeMap["CP"],
        leaveTypeCode: "CP",
        transactionType: "ACCRUAL",
        days: 5,
        effectiveDate: "2026-05-01",
        description: "Initial accrual upon onboarding (5 month(s) effective work @ 1d/mo)",
        createdBy: "system",
        createdAt: new Date("2026-05-01T08:00:00Z"),
      });

      // 2. Monthly Accrual for October
      await db.collection("leave_transactions").insertOne({
        companyId: cId,
        employeeId: empId,
        employeeName: emp.fullName,
        leaveTypeId: typeMap["CP"],
        leaveTypeCode: "CP",
        transactionType: "ACCRUAL",
        days: 1,
        effectiveDate: "2026-10-01",
        referenceId: "ACCRUAL_2026-10",
        description: "Monthly leave accrual — Period 2026-10 (+1d)",
        createdBy: "HR Administrator",
        createdAt: new Date("2026-10-01T08:00:00Z"),
      });

      // 3. Manual Adjustment (+1d carryover bonus)
      await db.collection("leave_transactions").insertOne({
        companyId: cId,
        employeeId: empId,
        employeeName: emp.fullName,
        transactionType: "ADJUSTMENT",
        days: 1,
        effectiveDate: "2026-10-15",
        description: "Annual carryover balance correction (+1d)",
        createdBy: "HR Administrator",
        createdAt: new Date("2026-10-15T09:30:00Z"),
      });

      // 4. Past Leave: 3 days TAKEN
      const pastReqId = new ObjectId();
      await db.collection("leave_requests").insertOne({
        _id: pastReqId,
        companyId: cId,
        employeeId: empId,
        employeeName: emp.fullName,
        departmentName: emp.departmentName,
        leaveType: "annual",
        leaveTypeId: typeMap["CP"],
        isPaid: true,
        startDate: "2026-09-14",
        endDate: "2026-09-16",
        days: 3,
        reason: "Late summer vacation",
        status: "taken",
        reviewedBy: "HR Administrator",
        createdAt: new Date("2026-09-01T10:00:00Z"),
        updatedAt: new Date("2026-09-17T00:00:00Z"),
      });

      await db.collection("leave_transactions").insertOne({
        companyId: cId,
        employeeId: empId,
        employeeName: emp.fullName,
        leaveTypeId: typeMap["CP"],
        leaveTypeCode: "CP",
        transactionType: "TAKEN",
        days: 3,
        effectiveDate: "2026-09-16",
        referenceId: pastReqId.toString(),
        description: "Paid leave taken #0916 (2026-09-14 → 2026-09-16)",
        createdBy: "system_scheduler",
        createdAt: new Date("2026-09-16T18:00:00Z"),
      });

      // 5. Future Leave: 2 days RESERVATION
      const futureReqId = new ObjectId();
      await db.collection("leave_requests").insertOne({
        _id: futureReqId,
        companyId: cId,
        employeeId: empId,
        employeeName: emp.fullName,
        departmentName: emp.departmentName,
        leaveType: "annual",
        leaveTypeId: typeMap["CP"],
        isPaid: true,
        startDate: "2026-12-21",
        endDate: "2026-12-22",
        days: 2,
        reason: "Family trip",
        status: "approved",
        reviewedBy: "HR Administrator",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await db.collection("leave_transactions").insertOne({
        companyId: cId,
        employeeId: empId,
        employeeName: emp.fullName,
        leaveTypeId: typeMap["CP"],
        leaveTypeCode: "CP",
        transactionType: "RESERVATION",
        days: 2,
        effectiveDate: "2026-12-21",
        referenceId: futureReqId.toString(),
        description: `Reservation for leave request #${futureReqId.toString().slice(-6)} (2026-12-21 → 2026-12-22)`,
        createdBy: "HR Administrator",
        createdAt: new Date(),
      });
      console.log(`      📊 Solde Breakdown -> Earned: 7d | Taken: 3d | Reserved: 2d | Available: 2d`);
    }

    if (emp.fullName === "Youssef Trabelsi") {
      // Accrual at 1.5d/month rate
      await db.collection("leave_transactions").insertOne({
        companyId: cId,
        employeeId: empId,
        employeeName: emp.fullName,
        leaveTypeId: typeMap["CP"],
        leaveTypeCode: "CP",
        transactionType: "ACCRUAL",
        days: 4.5,
        effectiveDate: "2026-08-01",
        description: "Initial accrual upon onboarding (3 month(s) effective work @ 1.5d/mo)",
        createdBy: "system",
        createdAt: new Date("2026-08-01T08:00:00Z"),
      });

      // Pending Request for 2 days
      await db.collection("leave_requests").insertOne({
        companyId: cId,
        employeeId: empId,
        employeeName: emp.fullName,
        departmentName: emp.departmentName,
        leaveType: "annual",
        leaveTypeId: typeMap["CP"],
        isPaid: true,
        startDate: "2026-11-20",
        endDate: "2026-11-23",
        days: 2,
        reason: "Extended weekend trip",
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`      ⏳ 1 Pending Request created (Ready for Approve/Reject test)`);
    }

    if (emp.fullName === "Amira Gharbi") {
      await db.collection("leave_transactions").insertOne({
        companyId: cId,
        employeeId: empId,
        employeeName: emp.fullName,
        leaveTypeId: typeMap["CP"],
        leaveTypeCode: "CP",
        transactionType: "ACCRUAL",
        days: 7,
        effectiveDate: "2026-04-01",
        description: "Initial accrual upon onboarding (7 month(s) effective work @ 1d/mo)",
        createdBy: "system",
        createdAt: new Date("2026-04-01T08:00:00Z"),
      });

      // Pending Half-Day Request (Morning)
      await db.collection("leave_requests").insertOne({
        companyId: cId,
        employeeId: empId,
        employeeName: emp.fullName,
        departmentName: emp.departmentName,
        leaveType: "annual",
        leaveTypeId: typeMap["CP"],
        isPaid: true,
        startDate: "2026-11-18",
        endDate: "2026-11-18",
        days: 0.5,
        halfDayOption: "morning",
        reason: "Administrative appointment (morning only)",
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`      🌓 1 Half-Day Pending Request created (0.5d Morning)`);
    }

    if (emp.fullName === "Karim Mansour") {
      await db.collection("leave_transactions").insertOne({
        companyId: cId,
        employeeId: empId,
        employeeName: emp.fullName,
        leaveTypeId: typeMap["CP"],
        leaveTypeCode: "CP",
        transactionType: "ACCRUAL",
        days: 12,
        effectiveDate: "2025-11-01",
        description: "Opening leave balance (12 months effective work)",
        createdBy: "system",
        createdAt: new Date("2025-11-01T08:00:00Z"),
      });

      await db.collection("leave_transactions").insertOne({
        companyId: cId,
        employeeId: empId,
        employeeName: emp.fullName,
        leaveTypeId: typeMap["CP"],
        leaveTypeCode: "CP",
        transactionType: "TAKEN",
        days: 2,
        effectiveDate: "2026-03-15",
        description: "Paid leave taken #0315",
        createdBy: "system_scheduler",
        createdAt: new Date("2026-03-15T08:00:00Z"),
      });
      console.log(`      🚪 Ready for Departure Test: Earned: 12d, Taken: 2d -> 10d Unused Balance`);
    }

    if (emp.fullName === "Nour Khemir") {
      await db.collection("leave_transactions").insertOne({
        companyId: cId,
        employeeId: empId,
        employeeName: emp.fullName,
        leaveTypeId: typeMap["CP"],
        leaveTypeCode: "CP",
        transactionType: "ACCRUAL",
        days: 10,
        effectiveDate: "2026-01-15",
        description: "Initial accrual upon onboarding",
        createdBy: "system",
        createdAt: new Date("2026-01-15T08:00:00Z"),
      });

      // Approved UNPAID leave in current month (2 working days)
      const currentYear = now.getFullYear();
      const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
      const unpaidStart = `${currentYear}-${currentMonth}-05`;
      const unpaidEnd = `${currentYear}-${currentMonth}-06`;

      await db.collection("leave_requests").insertOne({
        companyId: cId,
        employeeId: empId,
        employeeName: emp.fullName,
        departmentName: emp.departmentName,
        leaveType: "unpaid",
        leaveTypeId: typeMap["UNPAID"],
        isPaid: false,
        startDate: unpaidStart,
        endDate: unpaidEnd,
        days: 2,
        reason: "Personal urgent leave (unpaid)",
        status: "approved",
        reviewedBy: "HR Administrator",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`      💰 Unpaid Leave Created (2 days in ${currentMonthStr}) -> Base: 4,400 TND`);
    }
  }

  console.log("\n========================================================");
  console.log("🎉 HR Demo Data Successfully Injected!");
  console.log("========================================================");
  console.log("You can now open the app at http://localhost:3000/hr and test:");
  console.log("  1. Select 'Sarah Ben Salem'   -> See KPI Cards (Earned: 7d, Taken: 3d, Reserved: 2d, Available: 2d)");
  console.log("  2. Select 'Youssef Trabelsi'  -> Approve/Reject pending request & check Young Adult (1.5d/mo)");
  console.log("  3. Select 'Amira Gharbi'      -> View & review 0.5-day half-day request");
  console.log("  4. Employees tab: 'Karim Mansour' -> Click 'Deactivate' to review 10d unused departure compensation");
  console.log("  5. Payroll tab: 'Nour Khemir' -> Generate payslip and verify 400 TND unpaid deduction");
  console.log("  6. Leave tab: Click 'Monthly Accrual' -> Tests idempotency & blocks duplicate monthly credit");
  console.log("\n🧹 To clean up this demo data later, simply run:");
  console.log("   node scripts/seed-hr-demo.mjs --clean");
  console.log("========================================================\n");

  await client.close();
}

run().catch((err) => {
  console.error("❌ Error running seed script:", err);
  process.exit(1);
});

