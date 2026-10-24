# HR & Payroll Roadmap — 1.5 Days

**Project:** AnOps ERP (Next.js App Router)  
**Module:** HR & Payroll  
**Goal:** Working, demo-ready module. Scope cut to essentials only. Follows `ARCHITECTURE.md`, `layout-rules.md`, `design-system.md`, `ai_agent_rules.md` strictly.

---

## Tech Stack (from project)

- Next.js 16 App Router, MongoDB v6, NextAuth v5, Tailwind CSS v4, React 19, Zod, nodemailer
- `src/features/hr/` domain module, `src/server/` infra, `src/shared/` UI primitives

---

## Milestone 1 — Foundations & Employee CRUD (Day 1, Morning)

**What:** Module skeleton + employee list/create/view/edit/deactivate.  
**Demo entry:** `app/(dashboard)/hr/page.tsx`

| Task | Detail | Rule Reference |
|------|--------|----------------|
| Feature skeleton | `src/features/hr/{components,actions,schemas,types}` | ARCHITECTURE.md |
| Zod schema | Employee: email (unique, lowercase), full name, job_title, role (employee/admin), base_salary, status | ARCHITECTURE.md validation |
| Server actions | `createEmployee`, `updateEmployee`, `deactivateEmployee` in `actions/employees.ts` (`'use server'`) | ARCHITECTURE.md server actions |
| Server page | Employee list table + inline create/edit forms via server actions | thin route, no DB in app/ |
| Layout entry | Add "HR & Payroll" nav item to `src/shared/components/layout/sidebar.tsx` | design-system.md sidebar |
| DB | MongoDB `employees` collection via `src/server/db/client.ts` | ARCHITECTURE.md |

**Milestone 1 done:** Admin can add/edit/deactivate employees and see changes in list immediately.

---

## Milestone 2 — Leave Requests & Payroll (Day 1, Evening)

**What:** Submit leave request, admin approve/reject, generate net-salary payslip.

| Task | Detail | Rule Reference |
|------|--------|----------------|
| Leave schema | leave_type (annual/sick/unpaid), is_paid, start_date, end_date, reason, status (pending/approved/rejected) | Zod schema |
| Leave actions | `submitLeaveRequest`, `approveLeave`, `rejectLeave` | server actions |
| Views | Employee: "My requests" + submit form; Admin: "Pending approvals" table | thin routes under app/(dashboard)/hr/ |
| Leave balance | allowance (e.g. 20 days/yr) minus approved paid leave days | computed server-side |
| Payroll schema/formula | daily_rate = base_salary / 22; deduction = daily_rate * unpaid_days; net = base − deduction | math in server service |
| Payslip action | `generatePayslip` per employee/period, duplicate protection | server action |
| Payroll page | Select employee + period (YYYY-MM), view net salary | thin route |

**Milestone 2 done:** Employee submits leave → admin approves → payroll calculates correct net salary from unpaid days.

---

## Milestone 3 — AI HR Assistant + Polish (Day 2, Morning–Afternoon)

**What:** Chat UI that answers policy questions and reports own leave balance.

| Task | Detail | Rule Reference |
|------|--------|----------------|
| Policy docs | 2 sample policies: Leave Policy, Working Hours/Attendance (markdown text file) | ai_agent_rules.md |
| Chat UI | Simple message thread + input (`use client` only here) | ai_agent_rules.md client only when needed |
| API route | `src/app/api/hr/ai/route.ts` — LLM receives question + policy context | thin route |
| Leave-balance tool | Read-only lookup scoped to current session user | No cross-employee data |
| Guardrails | Refuse when unsure ("contact HR"), never invent policy | safety |
| Polish | Empty/loading states, error handling, consistent design tokens | design-system.md |

**Milestone 3 done:** Assistant answers from policies and reports real leave balance; refuses safely when unsure.

---

## Out of Scope (intentionally not demoed)

- Departments CRUD
- Attendance / check-in-check-out
- Search, filter, pagination
- Payslip PDF/print export
- Complex RAG / tool-calling AI (simple context prompt is enough)
- Cross-module Finance integration

---

## Verification Checklist (against all rules)

- [ ] `app/layout.tsx` is minimal (html, body, globals.css, metadata only)
- [ ] HR routes live under `app/(dashboard)/hr/`
- [ ] Root layout never imports DashboardShell
- [ ] No `server/*` imports in client components
- [ ] Mutations via server actions with `'use server'`
- [ ] Zod schemas validate both client and server
- [ ] TypeScript explicit types, no `any`
- [ ] Tailwind v4 + HSL CSS variables from `globals.css`
- [ ] Mobile-first classes (`flex-col`, `w-full`, `md:`/`lg:` overrides)
- [ ] Touch targets ≥ 44×44px
- [ ] Sidebar pinned bottom via `margin-top: auto` + CSS Modules if fragile

---

**Total estimated effort:** ~12–18 hours over 1.5 days. Each milestone is independently demoable — you can stop at any point and still have a working feature.
