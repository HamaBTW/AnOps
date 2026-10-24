# Agent Rules: Next.js + NextAuth PWA

## Core Architecture
- **Mobile-First:** Design and build for mobile screens first using Tailwind CSS (e.g., `flex-col`, `w-full` by default). Apply desktop styles using breakpoint modifiers (`md:`, `lg:`).
- **App Router:** Use Server Components (RSC) by default. Only use `'use client'` when browser APIs, state, or hooks are required.
- **Strict TypeScript:** No `any`. Use explicit types for props, API routes, and NextAuth session extensions.

## PWA & Offline Support
- **Manifest:** Maintain `public/manifest.json` with app icons (`192x192`, `512x512`, `maskable`), `display: "standalone"`, theme colors, and metadata.
- **Service Worker:** Configure `@ducanh2912/next-pwa` (or Serwist) for offline caching of static assets and critical routes.
- **Offline Fallback:** Provide a clean offline page (`/offline`) when requests fail and cache is unavailable.

## NextAuth (Auth.js)
- Configure auth in `app/api/auth/[...nextauth]/route.ts` (or `auth.ts`).
- Extend `Session` and `JWT` types explicitly in `types/next-auth.d.ts`.
- Protect routes via `middleware.ts` with graceful offline fallback handling.

## Multi-Tenancy & Data Isolation
- **Tenant Scoping:** The platform is multi-tenant. Every user belongs to one or more companies.
- **Mandatory `companyId`:** Every database query and insert must be filtered or populated with the active tenant's `companyId`.
- **Zero Cross-Tenant Leaks:** Never query business entities (employees, departments, attendance, payroll, invoices) globally without `companyId`.
- **Onboarding Flow:** Users without a company must be guided to create an initial company before accessing module dashboards.

## UI/UX Rules
- Touch target sizes must be at least `44x44px`.
- Handle notch and navigation safe areas (`env(safe-area-inset-*)`).
- Multi-tenant company switcher must be accessible from mobile and desktop shells.