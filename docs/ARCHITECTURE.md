# AnOps Architecture (Next.js App Router)

This document defines the canonical structure and rules for this project. Follow it strictly to keep the codebase scalable and maintainable.

## Folder Structure

```
src/
├── app/                    # Next.js App Router - ROUTES ONLY
│   ├── (auth)/            # Auth route group (no shell)
│   ├── (dashboard)/       # Dashboard route group (uses DashboardShell)
│   ├── api/               # Route handlers
│   ├── layout.tsx         # Root layout - minimal only
│   ├── global-error.tsx   # Global error boundary (must be 'use client')
│   └── not-found.tsx      # Root 404 (standalone)
│
├── features/              # Domain-driven modules
│   ├── auth/              # Authentication domain
│   │   ├── components/    # Auth UI components
│   │   ├── actions/       # Server actions
│   │   ├── schemas/       # Zod validation schemas
│   │   ├── hooks/         # Feature-specific hooks
│   │   └── types/         # Feature types
│   ├── crm/               # CRM module
│   ├── sales/             # Sales module
│   ├── finance/           # Finance module
│   ├── inventory/         # Inventory module
│   ├── purchasing/        # Purchasing module
│   ├── hr/                # HR module
│   ├── projects/          # Projects module
│   └── documents/         # Documents module
│
├── server/                # Server-only infrastructure
│   ├── auth/              # NextAuth configuration
│   │   ├── index.ts       # Auth config, providers, callbacks
│   │   └── types.ts       # NextAuth type augmentations
│   ├── db/                # Database layer
│   │   ├── client.ts      # MongoDB connection
│   │   └── schemas/       # Collection schemas/models
│   └── services/          # Shared business logic services
│
├── shared/                # Reusable across all features
│   ├── components/
│   │   ├── layout/        # App shell, sidebar, topbar
│   │   └── ui/            # Design system components
│   ├── hooks/             # Generic hooks (use-debounce, etc.)
│   ├── lib/               # Utilities (cn, helpers)
│   └── constants/         # App-wide constants
│
├── config/                # Configuration
│   └── env.ts             # Zod-validated environment variables
│
├── proxy.ts               # Next.js proxy (must stay at src/ root)
└── middleware.ts          # DO NOT USE - use proxy.ts instead
```

## Core Principles

### 1. App Router (`src/app/`)
- **Routes only** - Pages, layouts, route groups, API routes. NO business logic.
- **Thin by default** - Import from `features/` or `shared/`. Keep components minimal.
- **Route groups** - Use `(auth)` for unauthenticated flows, `(dashboard)` for authenticated app routes.
- **Root layout minimal** - Only `<html>`, `<body>`, globals.css, metadata. Never mount DashboardShell here.

### 2. Features (`src/features/`)
- **Domain-driven** - Each business module is self-contained.
- **Own everything** - Components, actions, schemas, hooks, types live here.
- **Server actions preferred** - Put mutations in `actions/` as server actions.
- **Validation** - Use Zod schemas in `schemas/`.

### 3. Server (`src/server/`)
- **Server-only** - All code here runs only on the server. Use `import 'server-only'` when appropriate.
- **Infrastructure** - Auth, DB, external services, business services.
- **No UI** - Never import React components here.
- **Repositories pattern** - DB queries should go through services/repositories.

### 4. Shared (`src/shared/`)
- **Truly reusable** - Used by multiple features with no feature-specific logic.
- **Design system** - UI components in `components/ui/`.
- **Layout** - App shell components in `components/layout/`.
- **Utilities** - Pure functions in `lib/`.

## Import Rules

```typescript
// ✅ Good
import { Button } from '@/shared/components/ui/button'
import { auth } from '@/server/auth'
import { loginSchema } from '@/features/auth/schemas'
import { DashboardShell } from '@/shared/components/layout/dashboard-shell'

// ❌ Bad - business logic in app
// Don't put DB queries directly in app/page.tsx

// ❌ Bad - importing server code in client components
// Don't import from '@/server/*' in 'use client' components
```

Use path aliases: `@/*` maps to `./src/*`

## File Conventions

- **Server components by default** - Only add `'use client'` when needed (hooks, event handlers, browser APIs)
- **Server actions** - Mark with `'use server'` in `actions/` files
- **Type safety** - No `any`. Extend types in `server/auth/types.ts` or feature `types/`
- **CSS Modules** - Use for fragile structural styles (pinned footers, complex layouts). Keep tokens in `globals.css`
- **Env vars** - Validate in `config/env.ts` with Zod. Never access `process.env` directly in features

## Special Cases

- **proxy.ts** - Must remain at `src/proxy.ts` (Next.js convention for this version). Do NOT rename/move.
- **global-error.tsx** - Must be a Client Component with `'use client'` and must include `<html>/<body>`.
- **not-found.tsx** - Root one is standalone (no shell). Dashboard routes can have their own in `(dashboard)/not-found.tsx`.
- **Type extensions** - Global type augmentations go in `server/auth/types.ts` or appropriate places.

## Auth Architecture

The auth system is split into an **edge-safe config** and a **full server config** so `proxy.ts` can run on the edge without importing MongoDB.

```
src/
├── server/auth/
│   ├── config.ts   # Edge-safe: JWT callbacks, pages, empty providers (NO db)
│   ├── index.ts    # Full: spreads config + MongoDB adapter + Credentials provider
│   └── types.ts    # Session/JWT augmentation (id, status, emailVerified)
├── server/db/
│   └── client.ts   # MongoDB client (imports "server-only")
├── features/auth/
│   ├── actions/    # Server actions (login, register, reset, verify, guards)
│   ├── components/ # AuthCard, Field, Button, client forms (useActionState)
│   └── schemas/    # Zod schemas
└── app/(auth)/     # login, register, forgot-password, reset-password, verify, unverified, banned
```

**Rules:**
- `proxy.ts` imports ONLY `server/auth/config.ts` (edge-safe). Never import `server/auth/index.ts` in proxy.
- Route handlers/actions import the full `server/auth/index.ts`.
- Account status: `active | unverified | banned`. Store on the user document and mirror into JWT/session.
- `(dashboard)` routes call `requireActive()` in the layout (defense-in-depth) AND are guarded by `proxy.ts`.
- Forms use client components with `useActionState` for inline errors; actions return `{ error?, success? }` or `redirect()`.

## Validation (Client + Server)

Every form validates on **both** sides using the **same Zod schema** (single source of truth).

- **Schemas** live in `src/features/<feature>/schemas/*.schema.ts` and export inferred types.
- **Client**: forms use `react-hook-form` + `zodResolver` (mode `onBlur`). Inputs use `TextField` (`src/shared/components/ui/text-field.tsx`) which renders accessible `aria-invalid`/`aria-describedby` errors. Forms use `noValidate` and never rely on native browser validation.
- **Server**: server actions and `authorize()` re-run the identical schema. Never trust the client. Helpers live in `src/shared/lib/validation.ts` (`parseWithSchema`, `toFieldErrors`).
- **Server errors**: actions return `{ error }` / `{ success }`; forms surface them as a root alert.
- **Rules**: trim strings, enforce password strength (min 8, letter + number, max 72), validate tokens (`/verify`, `/reset-password`), and normalize email to lowercase before DB use.

## Email (Verification + Password Reset)

- **Module**: `src/server/email/` — `client.ts` (nodemailer transport), `templates.ts` (branded HTML/text), `index.ts` (`sendVerificationEmail`, `sendPasswordResetEmail`).
- **Config**: `src/config/env.ts` validates `EMAIL_SERVER_HOST`, `EMAIL_SERVER_PORT`, `EMAIL_SERVER_SECURE` (`"true"`/`"false"`), `EMAIL_SERVER_USER`, `EMAIL_SERVER_PASSWORD`, `EMAIL_FROM`. All optional.
- **Dev fallback**: when `EMAIL_SERVER_HOST` or `EMAIL_FROM` is unset, `sendMail` logs the email to the server console (including the link) instead of sending. In production it throws.
- **Never block auth**: registration/reset actions wrap sends in `try/catch` and log failures, so a mail outage can't break sign-up or reset requests.
- **Links** use `NEXTAUTH_URL` via `getAppUrl()`: `/verify?token=…` (24h) and `/reset-password?token=…` (1h).
- Requires `nodemailer` (installed) and `@types/nodemailer` (dev).

## PWA

- `public/manifest.json` - icons, standalone display, theme color.
- `public/sw.js` - static asset cache + `/offline` navigation fallback.
- `src/shared/components/pwa-register.tsx` - registers SW in production only.
- `/offline` route - clean offline fallback page.

## Multi-Tenancy Architecture

AnOps is built on a **Shared-Database, Tenant-Discriminator (`companyId`)** multi-tenant architecture:

```
Tenant Boundary: Company
├── Core: companies, company_members
└── Feature Data (Strictly scoped by companyId):
    ├── HR: employees, departments, job_titles, attendance, leave_requests, payslips
    ├── CRM & Sales: customers, leads, opportunities, orders
    ├── Finance: invoices, expenses, payments
    └── Inventory: products, stock_movements, purchase_orders
```

### 1. Data Isolation Rules
- **Foreign Key Enforcement**: Every feature document MUST store `companyId: ObjectId`.
- **Query Scoping**: Every database read, insert, update, or delete MUST include `{ companyId: activeCompanyId }` in the query filter. No cross-tenant data leaks.
- **Role Isolation**: A user's role and permissions are evaluated within the context of their active company membership (`owner` | `admin` | `manager` | `employee`).

### 2. Active Tenant Context & Cookie
- The user's currently selected company ID is stored in an HTTP-only cookie: `anops_active_company_id`.
- Helper `getActiveCompanyId()` / `requireActiveCompany()` in `src/server/tenant/context.ts` resolves the active tenant for server components and actions.
- If the cookie is absent or invalid, the system automatically falls back to the user's primary company membership.

### 3. Onboarding & Company Switcher
- **Zero-Company Guard**: If an authenticated user has no company memberships, they are automatically routed to `/onboarding` to register their initial company.
- **Tenant Switcher**: A company selector in the top navigation allows multi-organization users to switch active companies seamlessly or provision additional companies.

## Adding New Features

1. Create `src/features/[feature-name]/` with subfolders as needed
2. Add route in `src/app/(dashboard)/[feature-name]/page.tsx` (thin, imports from feature)
3. Keep business logic in feature, infra in server, UI primitives in shared
4. Ensure all database models include `companyId`
5. Update proxy.ts protected routes if needed

## Quick Checklist

- [ ] Routes in `app/` are thin
- [ ] Server code in `server/`, UI in `shared/` or `features/`
- [ ] Multi-tenancy: every data record includes and filters by `companyId`
- [ ] No DB/auth imports in client components
- [ ] Imports follow the layer rules
- [ ] Types are explicit, no `any`
- [ ] Using server components by default

