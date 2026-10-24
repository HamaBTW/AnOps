# Roles & Permissions Specification

This document provides a comprehensive reference of all user roles, access control policies, security boundaries, and capabilities implemented across the AnOps platform.

---

## 1. Overview & Security Model

AnOps implements a **multi-tiered Role-Based Access Control (RBAC)** model with both **backend server-action enforcement** and **frontend UI adaptation**.

### Key Tenets
1. **Zero-Trust Backend**: Frontend UI hiding is for user experience only. Every server action strictly verifies the authenticated session and role through `@/server/auth/rbac`.
2. **Auto-Provisioned Super Admin**: The primary administrator account is provisioned automatically from environment variables on startup.
3. **Safe Default for Signups**: Any user who registers via the public signup page (`/register`) is automatically assigned the standard `employee` role by default.
4. **Data Isolation (Least Privilege)**: Non-admin users cannot query sensitive company data (salary totals, payslips, personal phone numbers, or attendance of peers).

---

## 2. Defined Roles

| Role Key | Display Name | Target Persona | Assignment Source |
| :--- | :--- | :--- | :--- |
| **`hr_admin`** | **HR Administrator / Super Admin** | People Operations Leads, Founders, System Administrators | Configured via `.env` (`ADMIN_EMAIL`) or granted by an admin |
| **`manager`** | **Department / Team Manager** | Department Heads, Team Leads, Supervisors | Assigned by an `hr_admin` in the Employee Directory |
| **`employee`** | **Staff Member (Standard User)** | Individual contributors, general employees, public signups | Default role for public registration and newly provisioned staff |

### 2.1 Multi-Tenant Role Isolation
Roles are evaluated strictly within the context of the user's **Active Company**:
- **Company Creator / Owner**: Automatically granted `owner` and `hr_admin` for the created company.
- **Invited Staff**: An employee added by an admin receives their designated role (`employee`, `manager`, `hr_admin`) within that specific company.
- **Multi-Company Memberships**: A user can be an `hr_admin` in Company A, but a regular `employee` in Company B. Switching active companies immediately updates the effective permissions and data boundary.

---

## 3. Capability Matrix (Can vs Cannot)

### 3.1 Authentication & Account Provisioning

| Action / Capability | `hr_admin` | `manager` | `employee` | Notes |
| :--- | :---: | :---: | :---: | :--- |
| Sign in with email and password | ✅ **CAN** | ✅ **CAN** | ✅ **CAN** | NextAuth Credentials flow |
| Public self-registration (`/register`) | — | — | ✅ **CAN** | Assigned `employee` role and `unverified` status until email verified |
| Auto-provision admin from environment | ✅ **CAN** | ❌ CANNOT | ❌ CANNOT | Uses `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.env` |
| Auto-provision staff login with temporary password | ✅ **CAN** | ❌ CANNOT | ❌ CANNOT | When adding a new employee, a secure temp password is generated |
| First-login forced password reset | — | — | ✅ **FORCED** | Provisioned staff must set a personal password at `/reset-password?force=1` |
| Change personal password | ✅ **CAN** | ✅ **CAN** | ✅ **CAN** | Via profile settings or password reset link |

---

### 3.2 Employee Directory & Staff Management

| Action / Capability | `hr_admin` | `manager` | `employee` | Notes |
| :--- | :---: | :---: | :---: | :--- |
| Access "Employees" Management Tab | ✅ **CAN** | ❌ CANNOT | ❌ CANNOT | Hidden in navigation for non-admins |
| Add new employee profile | ✅ **CAN** | ❌ CANNOT | ❌ CANNOT | Opens modal with department, job title, and salary fields |
| Edit employee details (salary, department, role) | ✅ **CAN** | ❌ CANNOT | ❌ CANNOT | Backend enforced by `requireAdminUser()` |
| Toggle employee active / inactive status | ✅ **CAN** | ❌ CANNOT | ❌ CANNOT | Deactivated staff cannot log in or record attendance |
| View confidential employee salaries (`baseSalary`) | ✅ **CAN** | ❌ CANNOT | ❌ CANNOT | Stripped to `0` by backend filter for non-admin queries |
| View basic active team directory | ✅ **CAN** | ✅ **CAN** | ✅ **CAN** | Name, job title, and department only |

---

### 3.3 Departments & Job Titles

| Action / Capability | `hr_admin` | `manager` | `employee` | Notes |
| :--- | :---: | :---: | :---: | :--- |
| View departments and job titles | ✅ **CAN** | ✅ **CAN** | ✅ **CAN** | Needed for form selectors and team context |
| Create a new department | ✅ **CAN** | ❌ CANNOT | ❌ CANNOT | Enforced by `createDepartmentAction` |
| Edit or delete an existing department | ✅ **CAN** | ❌ CANNOT | ❌ CANNOT | Protected by `requireAdminUser()` |
| Create, edit, or delete job titles | ✅ **CAN** | ❌ CANNOT | ❌ CANNOT | Predefined titles are protected from accidental deletion |
| Reseed HR system defaults | ✅ **CAN** | ❌ CANNOT | ❌ CANNOT | Restores default departments, roles, and titles |

---

### 3.4 Time-Off & Leave Management

| Action / Capability | `hr_admin` | `manager` | `employee` | Notes |
| :--- | :---: | :---: | :---: | :--- |
| Submit a leave request for **oneself** | ✅ **CAN** | ✅ **CAN** | ✅ **CAN** | Validated against personal leave balance |
| Submit leave on behalf of **another employee** | ✅ **CAN** | ❌ CANNOT | ❌ CANNOT | Employees are restricted to their own `employeeId` |
| View **own** leave requests & balance | ✅ **CAN** | ✅ **CAN** | ✅ **CAN** | Shows annual allowance, days used, and remaining |
| View **all company-wide** leave requests | ✅ **CAN** | ✅ **CAN** | ❌ CANNOT | Non-admins only see "My Requests" tab |
| Approve or Reject leave requests | ✅ **CAN** | ✅ **CAN** | ❌ CANNOT | Action buttons hidden; backend checks `hr_admin` or `manager` |
| Record reviewer identity & timestamp | ✅ **CAN** | ✅ **CAN** | ❌ CANNOT | Stores `reviewedBy` and review note |

---

### 3.5 Attendance & Punch Clock

| Action / Capability | `hr_admin` | `manager` | `employee` | Notes |
| :--- | :---: | :---: | :---: | :--- |
| Punch In / Punch Out for **oneself** | ✅ **CAN** | ✅ **CAN** | ✅ **CAN** | Records timestamp and status (`present` / `on_time` / `late`) |
| Switch active staff member on punch clock | ✅ **CAN** | ❌ CANNOT | ❌ CANNOT | Dropdown switcher is locked to own identity for non-admins |
| View **own** attendance history log | ✅ **CAN** | ✅ **CAN** | ✅ **CAN** | Filterable by date range |
| View **company-wide** daily attendance statistics | ✅ **CAN** | ❌ CANNOT | ❌ CANNOT | Summary metrics (Present Now, Total Expected, Late Count) |
| Query peer attendance logs | ✅ **CAN** | ❌ CANNOT | ❌ CANNOT | Backend forcefully injects caller's `employeeId` for non-admins |

---

### 3.6 Payroll & Payslips

| Action / Capability | `hr_admin` | `manager` | `employee` | Notes |
| :--- | :---: | :---: | :---: | :--- |
| View **own** payslips | ✅ **CAN** | ✅ **CAN** | ✅ **CAN** | Gross salary, deductions, and net payout |
| View or inspect **other employees'** payslips | ✅ **CAN** | ❌ CANNOT | ❌ CANNOT | Backend checks `payslip.employeeId === callerEmployee.id` |
| Preview **own** payroll calculation preview | ✅ **CAN** | ✅ **CAN** | ✅ **CAN** | Based on working days and unpaid leave deductions |
| Preview **peer** payroll calculation | ✅ **CAN** | ❌ CANNOT | ❌ CANNOT | Protected by `previewEmployeePayrollAction` |
| Trigger month-end batch payroll generation | ✅ **CAN** | ❌ CANNOT | ❌ CANNOT | Button hidden for non-admins; guarded by `requireAdminUser()` |
| View total company financial payroll summary | ✅ **CAN** | ❌ CANNOT | ❌ CANNOT | Non-admins receive zeroed company totals for privacy |

---

### 3.7 AI HR Policy Assistant

| Action / Capability | `hr_admin` | `manager` | `employee` | Notes |
| :--- | :---: | :---: | :---: | :--- |
| Ask HR policy and labor regulation questions | ✅ **CAN** | ✅ **CAN** | ✅ **CAN** | Available to all authenticated team members |
| View company policies (Leave, Attendance, Code of Conduct) | ✅ **CAN** | ✅ **CAN** | ✅ **CAN** | Grounded in `COMPANY_POLICIES` |

---

## 4. Implementation Reference

### 4.1 Environment Configuration (`.env`)
```bash
# Super Admin Account (auto-created on startup if it doesn't exist)
ADMIN_EMAIL=admin@anops.internal
ADMIN_PASSWORD=AdminPass123!
ADMIN_NAME="System Administrator"
```

### 4.2 Auth Resolution Order
When a user signs in, their session role is resolved in the following priority order:
1. Linked document in `employees` collection (`employee.role`).
2. Stored role on `users` collection (`user.role`).
3. Match against `process.env.ADMIN_EMAIL` (`hr_admin`).
4. Fallback default: **`employee`**.

### 4.3 RBAC Helpers (`src/server/auth/rbac.ts`)
* `requireAuthUser()`: Validates that the caller has an active NextAuth session.
* `requireAdminUser()`: Validates that `role === "hr_admin"`. Throws a `Forbidden` error if not.
