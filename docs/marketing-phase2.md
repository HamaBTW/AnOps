# Marketing & Social Management — Phase 2 Implementation Guide

This document details the production operational workflows, tenancy migration, background worker setup, provider integrations, security models, and verification steps for the AnOps Marketing & Social Management module.

---

## 1. Tenancy Migration Procedure

The Marketing module strictly enforces canonical company isolation (`companies`, `company_members`, `WorkspaceContext`). If legacy or standalone databases contain shadow company marketing documents, migrate them using the idempotent migration tool:

```bash
# 1. Dry run (inspect detected shadow companies and duplicate resolution)
npm run db:migrate-marketing

# 2. Apply the migration
npm run db:migrate-marketing -- --apply
```

### What the migration does:
- Locates documents in marketing collections owned by shadow/standalone companies.
- Identifies the canonical primary company (e.g. "Farmy" / `anops_active_company_id`).
- Merges contacts safely, resolving duplicate emails or phones without index collisions.
- Migrates tags, audience definitions, templates, campaigns, deliveries, and social records to the canonical company.
- Drops obsolete shadow company records once merged.
- Is fully idempotent and safe to re-run.

---

## 2. Background Workers

The module relies on two decoupled worker processes designed for high reliability, atomic leasing, and crash-resilience.

### A. Campaign Delivery Worker
Processes pending and scheduled message deliveries across email and SMS channels:

```bash
npm run marketing:delivery-worker
```
- **Script**: `scripts/run-delivery-worker.mjs`
- **Lease duration**: 30 seconds default (configurable via `MARKETING_LEASE_MS`)
- **Batch size**: 50 records per claim
- **Max retry attempts**: 5 attempts with exponential backoff
- **Atomicity**: Single-worker atomic claims using MongoDB `findOneAndUpdate`
- **Double Consent Check**: Validates opt-in consent at enqueue time and re-checks immediately prior to external provider handoff. Revoked consent automatically cancels the delivery.

### B. Social Publishing Worker
Publishes scheduled social posts across connected Facebook and Instagram accounts:

```bash
npm run marketing:social-worker
```
- **Script**: `scripts/run-social-worker.mjs`
- **State transitions**: `scheduled` → `publishing` → `published` (or `failed`)
- **Exponential backoff**: Automatically retries transient provider errors up to 3 times before terminal failure.

---

## 3. Environment Variables & Secrets

Add the following environment variables to your production environment or `.env.local`:

```env
# Encryption key for OAuth tokens and sensitive social credentials (AES-256-GCM)
# Must be a base64-encoded 32-byte key (generate with: openssl rand -base64 32)
SOCIAL_TOKEN_ENCRYPTION_KEY=your-base64-32-byte-key-here

# Secret for validating inbound delivery webhook signatures
MARKETING_WEBHOOK_SECRET=your-webhook-secret-here

# Meta / Facebook Graph API Credentials
FACEBOOK_APP_ID=your-meta-app-id
FACEBOOK_APP_SECRET=your-meta-app-secret
FACEBOOK_REDIRECT_URI=https://app.anops.tn/api/marketing/social-accounts/facebook/callback

# Instagram Professional App Credentials
INSTAGRAM_APP_ID=your-instagram-app-id
INSTAGRAM_APP_SECRET=your-instagram-app-secret
INSTAGRAM_REDIRECT_URI=https://app.anops.tn/api/marketing/social-accounts/instagram/callback
```

---

## 4. Provider Truthfulness & Unconfigured State

The Marketing module is designed with strict provider truthfulness:
- **No Mock Deliveries**: If email or SMS providers (Resend, Twilio) are not configured, delivery dispatch returns truthful `{ providerConfigured: false }` and logs descriptive delivery failures rather than generating fabricated success metrics.
- **No Mock Social Metrics**: Reach, impressions, and engagement figures reflect actual provider aggregations or real campaign events. Zero metrics are shown when accounts are unlinked or unconfigured.
- **Safe AI Copywriter**: If no AI provider key is set, the copywriter gracefully returns an unconfigured status rather than fabricating mock outputs.

---

## 5. Security & Formula Injection Defense

### A. CSV Export Protection
The contact export route (`/api/marketing/contacts/export`) implements automated formula injection prevention (CSV Injection / CWE-1236):
- Any cell starting with `=, +, -, @, \t, \r` is prefixed with a single quote (`'`).
- Fields containing quotes or commas are properly enclosed in standard RFC 4180 quotes.
- Requires `marketing.export` permission.

### B. Secret Protection
OAuth access tokens and refresh tokens are:
- Encrypted using `AES-256-GCM` with random 12-byte IVs and authenticated tags prior to database insertion.
- Excluded from all MongoDB projection queries returned to API endpoints or UI components.

---

## 6. Verification and Quality Gates

All changes must pass three automated quality gates:

```bash
# 1. Typecheck
npm run typecheck

# 2. Automated test suite (177 tests across unit, integration, and multi-tenant isolation)
npm test

# 3. Production build
npm run build
```