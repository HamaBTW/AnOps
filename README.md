# AnOps — Multi-Tenant AI-Native ERP Platform

AnOps is a modern, modular, multi-tenant Business Operations & ERP platform designed for small and medium enterprises. It unites People Operations (HR & Payroll), CRM, Sales, Finance & Invoicing, Inventory, and AI Assistants under a single unified dashboard.

---

## Key Features

- **🏢 Multi-Company Architecture:** Every user creates a company on first sign-in (onboarding) and can belong to several companies. Each company has its own staff, departments, job titles, attendance and business data. Nothing is shared between companies, and the active company is switched from the top bar. See docs/ARCHITECTURE.md and docs/ROLES_AND_PERMISSIONS.md.
- **👥 People Operations (HR & Payroll):**
  - **Employee Directory:** Complete staff CRUD with job titles, departments, and confidential salary safeguards.
  - **Time-Off & Leave Management:** Leave allowances, balance deductions, and multi-tier approval workflows.
  - **Punch Clock & Attendance:** Daily check-in/check-out tracking, punctuality status, and personal history logs.
  - **Automated Payroll Generator:** Monthly gross/net salary calculations with automated unpaid leave deductions and payslip generation.
  - **AI HR Policy Assistant:** Grounded retrieval assistant providing real-time answers to company policy questions.
- **🔐 Multi-Role RBAC:** Role-based access control (`hr_admin`, `manager`, `employee`) enforced across the frontend and server actions.
- **⚡ Next.js App Router + PWA:** Built on Next.js 16 (Turbopack), NextAuth, Tailwind CSS design system, and full offline PWA support.

---

## Tech Stack

- **Framework:** Next.js (App Router, Server Actions, Server Components)
- **Database:** MongoDB (via native driver)
- **Authentication:** NextAuth (Auth.js) Credentials provider + bcrypt
- **Styling:** Vanilla CSS design tokens + Tailwind CSS utilities
- **Type Safety:** Strict TypeScript + Zod schema validation
- **PWA:** Web App Manifest & Service Worker caching

---

## Getting Started

### 1. Environment Setup
Copy `.env.example` to `.env` and configure your settings:
```bash
MONGODB_URI=mongodb://localhost:27017
AUTH_SECRET=your-secret-key
ADMIN_EMAIL=admin@anops.internal
ADMIN_PASSWORD=AdminPass123!
```

### 2. Install & Run
```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the platform.

---

## Documentation

- [Architecture & Layering Rules](docs/ARCHITECTURE.md)
- [Roles & Permissions Matrix](docs/ROLES_AND_PERMISSIONS.md)
- [Design System & Tokens](docs/design-system.md)
- [Agent & Engineering Rules](ai_agent_rules.md)
