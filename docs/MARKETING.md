# Marketing, Campaigns & Social — Architecture and Operations

Owner: Marketing module (Nesrine Derouiche's domain). Status and limits are stated per section. Anything not
listed as implemented here is not implemented.

## 1. Scope at a glance

| Area | Status |
| --- | --- |
| Contacts (CRUD, search, filters, sort, duplicates, archive/delete rules) | Implemented, tested |
| Tags (CRUD, many-to-many assignment, bulk assign/remove, tag filters) | Implemented, tested |
| Consent by channel and purpose, history, ordering rules | Implemented, tested |
| Suppression and unsubscribe (signed, idempotent links) | Implemented, tested |
| Audiences (typed rules, preview, exclusion breakdown) | Implemented, tested |
| Templates (CRUD, duplicate, activate, variable allowlist, SMS length) | Implemented, tested |
| Campaigns (state machine, approval, recipient snapshot, scheduling) | Implemented, tested |
| Dispatch worker (durable jobs, leases, retries, per-send consent recheck) | Implemented, tested against a fake provider |
| Delivery events and webhook receiver (signed, deduplicated) | Implemented, tested; not verified against any real provider |
| SMS sending (Brevo API) | Implemented, unit and integration tested with a fake Brevo client. **Not verified against a live Brevo account.** Requires a registered SMS sender |
| Email sending (Brevo API) | Implemented, tested with a fake client. Disabled until `BREVO_EMAIL_MARKETING_APPROVED=true`. Policy confirmation pending |
| Facebook Page connection and publishing | Implemented against Meta's Graph API; **not verified against a live Meta app** |
| Instagram publishing | Not implemented (needs separate Meta review) |
| Social posts (draft, schedule, publish, cancel, ambiguous-result handling) | Implemented, tested with a fake publisher |
| AI copywriter (drafts, approval, copy into campaign/post) | Implemented, tested with a fake AI provider |
| Analytics (dashboard, campaign report, rates with denominators) | Implemented, tested |
| CRM / Sales integration | Contract defined (§3). No CRM code consumes it yet |

## 2. Domain entities and collections

All collections are prefixed `marketing_` and every document carries `companyId` (the tenant key).

| Collection | Purpose | Key constraints |
| --- | --- | --- |
| `marketing_contacts` | Canonical contact identity | Unique `(companyId, normalizedEmail)` where an email exists |
| `marketing_tags` | Tag definitions | Unique `(companyId, normalizedName)` |
| `marketing_contact_tags` | Many-to-many assignments | Unique `(companyId, contactId, tagId)` |
| `marketing_consent_events` | Append-only consent history | Never updated or deleted |
| `marketing_consent_states` | Effective consent per contact/channel/purpose | Unique `(companyId, contactId, channel, purpose)` |
| `marketing_suppressions` | Company suppression list (unsubscribed, bounced, complained, manual) | Unique `(companyId, channel, normalizedDestination)` |
| `marketing_audiences` | Saved selection rules (evaluated dynamically) | Unique `(companyId, normalizedName)` |
| `marketing_templates` | Reusable text, versioned | Unique `(companyId, normalizedName)` |
| `marketing_campaigns` | Campaign header, content, frozen snapshot summary | Versioned (optimistic concurrency) |
| `marketing_deliveries` | One row per campaign recipient, including suppressed ones | Unique `(companyId, campaignId, contactId)`; `providerMessageId` unique when set |
| `marketing_delivery_events` | Provider events | Unique `(companyId, providerEventId)` |
| `marketing_jobs` | Durable background jobs | Unique `(companyId, key)` |
| `marketing_social_accounts` | Connected Pages; encrypted token envelope | Unique `(companyId, platform, externalAccountId)` |
| `marketing_social_oauth_states` | Single-use OAuth states (SHA-256 of the state) | TTL on `expiresAt` |
| `marketing_social_posts` | Post drafts, schedules and publication records | Status machine (§6) |
| `marketing_ai_generations` | AI drafts, approval status, model metadata | Company and user indexes |

Indexes are declared in `src/server/marketing/indexes.ts` and merged into `src/server/db/indexes.ts`. They run
through the existing idempotent `ensureIndexes()`.

### Canonical contact identity and the CRM contract

`marketing_contacts` is the only person record for marketing. Rules for CRM and Sales:

1. CRM and Sales must reference a contact by its `_id` (`contactId`). They must not create a second record for the same person.
2. Identity is company-scoped. The same email address in two companies is two unrelated contacts. Nothing is merged across companies.
3. `email` is unique per company. Phone numbers are not unique, because households and businesses legitimately share them.
4. Campaign history for a contact is read from `marketing_deliveries` by `(companyId, contactId)`. CRM may report on it through `listDeliveries`-style queries; it must not copy it.
5. Lifecycle stage (`lead`, `prospect`, `customer`, `inactive`) is a single field on the contact. Tags are independent.
6. A contact with campaign or consent history cannot be deleted, only deactivated. CRM must follow the same rule.

## 3. Tenancy, permissions and routes

- Every service takes `WorkspaceContext` from `resolveWorkspace()` and never accepts a company id from input.
- Every read and write filters on `ctx.companyId`. Cross-company identifiers return `NOT_FOUND`.
- Permissions live in `src/server/security/permissions.ts` (`marketing.*`). Role mapping:

| Permission | owner | admin | operator | viewer |
| --- | :-: | :-: | :-: | :-: |
| `marketing.read` | ✓ | ✓ | ✓ | ✓ |
| `marketing.contact.manage` | ✓ | ✓ | ✓ | |
| `marketing.tag.manage` | ✓ | ✓ | ✓ | |
| `marketing.audience.manage` | ✓ | ✓ | ✓ | |
| `marketing.template.manage` | ✓ | ✓ | ✓ | |
| `marketing.consent.manage` | ✓ | ✓ | ✓ | |
| `marketing.campaign.manage` (drafts, submit) | ✓ | ✓ | ✓ | |
| `marketing.campaign.approve` (approve, return) | ✓ | ✓ | | |
| `marketing.campaign.dispatch` (schedule, cancel approved/scheduled) | ✓ | ✓ | | |
| `marketing.social.manage` (connect, disconnect, drafts) | ✓ | ✓ | ✓ | |
| `marketing.social.publish` (schedule, cancel posts) | ✓ | ✓ | ✓ | |
| `marketing.ai.generate` | ✓ | ✓ | ✓ | |

Separation of duties: the person who created or submitted a campaign cannot approve it. The owner (who holds
`dispatch`) may approve their own campaign; that exception is written to the audit event as `selfApproval: true`.

Pages live under `src/app/(dashboard)/marketing/`. Public routes: `/unsubscribe` (signed token only).
API routes:

| Route | Method | Auth | Purpose |
| --- | --- | --- | --- |
| `/api/v1/marketing/worker` | POST | `Authorization: Bearer MARKETING_WORKER_SECRET` | Runs a bounded batch of due jobs |
| `/api/v1/marketing/webhooks/delivery` | POST | `x-anops-signature` HMAC | Records provider delivery events |
| `/api/v1/marketing/social/callback` | GET | Session + single-use OAuth state | Completes Facebook Page connection |

Server actions live in `src/features/marketing/actions/`. Every action validates input with the shared Zod schema,
resolves the workspace, checks permission in the service, and returns `ActionResult`.

## 4. Consent and suppression

- Consent is recorded per channel (`email`, `sms`) and purpose (`marketing`). Email consent never authorises SMS.
- `marketing_consent_events` keeps everything. `marketing_consent_states` holds the effective state.
- Ordering: an event changes the effective state only if its `occurredAt` is newer than the stored one. On equal times, a
  withdrawal wins. Older events are kept in history but do not change the state.
- Eligibility (`src/server/marketing/eligibility.ts`) is the only rule set. It is checked in order:
  1. contact is active and not `inactive` stage
  2. a destination exists for the channel
  3. effective marketing consent for that channel is `granted`
  4. the destination is not on the suppression list
- Eligibility is evaluated when a campaign is approved (to build the snapshot) and again immediately before every provider call.
- Unsubscribe links are HMAC-signed (key derived from `AUTH_SECRET` with a fixed label). They carry company, contact, channel
  and optional campaign, and cannot be edited. Confirmation is a button (not a GET), so mail scanners that prefetch links
  change nothing. Repeated confirmations are idempotent.
- Bounces and complaints add the destination to the suppression list.

Legal basis: the code records and enforces the consent state it is given. Whether a given jurisdiction requires opt-in,
opt-out, or a particular notice is a business decision that needs qualified review. The module does not assert compliance.

## 5. Audiences and recipient snapshots

- Audiences store a typed rule (`all`/`any` over at most 10 conditions: lifecycle stage, source, active, tags (any/all),
  consent (granted/not granted), created after). Rule values are validated by Zod and become typed Mongo clauses; no
  client-supplied operators are possible.
- Membership is **evaluated dynamically**. It is never stored as a list.
- Preview evaluates at most 20,000 contacts and reports when it truncates.
- **Snapshot rule:** at approval, every matching contact is evaluated once. Eligible contacts become `pending` delivery rows,
  and the rest become `suppressed` rows with a reason. The unique `(companyId, campaignId, contactId)` index makes a contact
  appear at most once. Snapshots are capped at 20,000 recipients.
- Approval rebuilds the snapshot idempotently. A failed approval leaves no approved state.
- Audience edits never change an approved campaign. Campaign content is locked from submission onward.

## 6. State machines

**Campaign** (`src/features/marketing/utils/campaign-state.ts`):

```
draft → pending_approval → approved → scheduled → processing → completed
  │          │  ↑ (return)     │           │            └────→ failed
  └──→ cancelled ←─────────────┴───────────┘  (cancel allowed until processing)
```

Every transition is a conditional update that checks the expected status and version. Two users cannot both approve or
schedule the same campaign. Delivery state is separate: a campaign completes even when some deliveries failed.

**Delivery:** `pending → sending → sent → delivered | bounced | complained`; `pending|sending → failed`; any
unsent recipient at dispatch → `suppressed` with a reason. A late `delivered` never overwrites a bounce.

**Job:** `queued → running → succeeded | queued (retry or requeue) | dead | cancelled`.

**Social post:** `draft → scheduled → publishing → published`; `publishing → failed | needs_reconciliation`;
`failed → scheduled | draft`; `scheduled → cancelled | draft`. `needs_reconciliation` is terminal for the automatic
flow because the provider may have accepted the post.

**AI draft:** `generated_draft → edited → approved_for_use`; editing an approved draft clears approval; `failed` is terminal.

## 7. Background processing

Scheduled work is stored as a row in `marketing_jobs` with a `runAt` time. Nothing runs on a timer in the web process.

- `POST /api/v1/marketing/worker` claims up to 5 due jobs per call. Each claim takes a 10-minute lease; a crashed
  worker's lease expires and another worker takes the job.
- Campaign dispatch advances at most 20 deliveries per run and requeues itself until none are pending.
- Per-delivery retry: exponential backoff with full jitter, up to 5 attempts. Permanent errors fail immediately.
- Job retry: up to 6 attempts, then `dead`. A dead campaign job marks the campaign `failed`.
- Provider rate limit: `minIntervalMs` (200 ms) between sends, sequential. Tune to your Brevo plan.
- Send timeout: 15 seconds per provider call.
- **Duplicate-send safety:** a delivery is retried only when the provider did not process the request (HTTP 429, or a
  failure before the provider was called). A timeout, network error, 5xx, or unreadable reply may mean the message was
  accepted, so the delivery ends as `failed` with code `AMBIGUOUS_SEND` and is never retried automatically. Check
  the provider's logs before resending. Definite rejections (400, 401/403, not allowlisted) also fail without retry.

**Operating requirement:** an external scheduler must call the worker endpoint every minute:

```bash
curl -X POST "https://<your-host>/api/v1/marketing/worker" -H "Authorization: Bearer $MARKETING_WORKER_SECRET"
```

Without a scheduler, scheduled campaigns and posts never run. The Integrations page reports whether the secret is set;
it cannot verify that a scheduler is calling.

## 8. Providers, webhooks and what "sent" means

- `src/server/marketing/providers.ts` returns an adapter for a channel only when its settings are valid. Otherwise the
  channel is unconfigured and scheduling is refused. **Nothing is reported as sent unless Brevo returns a message id.**
- Brevo SMS: `POST https://api.brevo.com/v3/transactionalSMS/send` with `type: "marketing"`. The response `messageId`
  is stored. Recipients are digits with the country code. The sender must be 11 letters/digits or 15 digits.
- Brevo email: `POST https://api.brevo.com/v3/smtp/email`, response `messageId`. Offered only when
  `BREVO_EMAIL_MARKETING_APPROVED=true`. Brevo's policy for marketing mail through this transactional endpoint must be
  confirmed by the account owner first.
- Gmail SMTP (`EMAIL_SERVER_*`) is used only for verification and password reset. It is never a campaign provider.
- **Brevo webhooks are not signed.** Brevo's documentation describes no signature, shared secret or IP allowlist for
  event callbacks. The receiver is therefore `POST /api/v1/marketing/webhooks/brevo/<BREVO_WEBHOOK_TOKEN>`, with the
  token compared in constant time. Treat the full URL as a secret. Rotate `BREVO_WEBHOOK_TOKEN` if it leaks. This is a
  weaker control than a signature.
- Event dedupe: Brevo events carry no documented unique id per event. A SHA-256 over the event's stable fields is the
  dedupe key, so a repeated event is stored once. A company is taken from the stored delivery, never the payload.
- Brevo email events mapped: delivered, hard bounce (bounced), spam (complained), blocked and invalid email (failed),
  opened, click, unsubscribed. Soft bounces and deferrals are ignored. SMS mapping (`delivered`, `hard_bounce`,
  `rejected`, `blacklisted`, `unsubscribe`) is based on documented event names. Confirm the exact status strings against
  a real payload from your account before relying on SMS reporting. Unknown values are ignored.
- Controlled recipients: set `MARKETING_SEND_ALLOWLIST` for the first live sends. Non-listed destinations are refused
  before any request is made.

## 9. Integrations setup

### Brevo (SMS and marketing email)
1. Create the API key in Brevo under SMTP & API. Set `BREVO_API_key`. Do not use Brevo's SMTP key or MCP key here.
2. Verify the sender domain for email (SPF, DKIM, DMARC) in Brevo, then set `BREVO_SENDER_EMAIL` and `BREVO_SENDER_NAME`.
3. For SMS, register the sender ID in every country you message (required for accounts created after 13 March 2026, per
   Brevo's help centre). Set `BREVO_SMS_SENDER`.
4. Generate `BREVO_WEBHOOK_TOKEN` (for example `openssl rand -base64 48`). In Brevo, add the event callback URL
   `<NEXTAUTH_URL>/api/v1/marketing/webhooks/brevo/<BREVO_WEBHOOK_TOKEN>`. For SMS, the adapter also sends this URL per
   message as `webUrl`.
5. Start with `MARKETING_SEND_ALLOWLIST` set to your own test numbers and addresses. Remove it only after successful
   controlled sends.
6. Leave `BREVO_EMAIL_MARKETING_APPROVED=false` until you have confirmed Brevo's policy for this use.

Required live checks before production: a controlled SMS send, a delivered callback, a bounce callback, and an
unsubscribe callback, each observed in Brevo and in the Campaign delivery list.

### Facebook Pages
1. Create a Meta app. Add the *Facebook Login* product. Set the valid OAuth redirect URI to
   `<NEXTAUTH_URL>/api/v1/marketing/social/callback`.
2. Request only: `pages_show_list`, `pages_manage_posts`, `pages_read_engagement`. Publishing to Pages requires Meta app review.
3. Set `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` and `SOCIAL_TOKEN_ENCRYPTION_KEY`.
4. The Graph API version is `META_GRAPH_VERSION` in `src/server/marketing/config.ts`. Confirm it against Meta's current
   version before enabling.

Flow: `startSocialConnection` stores a hash of a random 256-bit state (10-minute expiry, bound to the company and user).
The callback consumes the state atomically, re-checks the user's live membership and role, exchanges the code, upgrades
to a long-lived token, lists Pages, and stores each Page token encrypted.

### Token encryption
- `SOCIAL_TOKEN_ENCRYPTION_KEY`: 32 random bytes, encoded as **base64 (44 characters, ending in `=`)** or **hex (64 characters)**.
  Generate with `openssl rand -base64 32`. Anything else disables the integration with a message naming the variable.
- Envelope: `v1.<iv>.<tag>.<ciphertext>` (AES-256-GCM, 12-byte random IV per encryption, 16-byte tag).
- Tokens are never returned by any DTO, log line, or error message.
- **Rotation:** the envelope has a version field. Rotation requires decrypting with the old key and re-encrypting with the new
  one. No rotation tool is provided yet; plan for it before the first production rotation.

### AI copywriter
Uses the shared server-side provider master (`@/server/ai`). It is unavailable until a provider key is set. Generation is
rate-limited to 10 per user per hour in-process; a multi-instance deployment needs a shared limiter. Prompts put the brief
inside `<brief>` tags with instructions in the system prompt. No contact data is sent to the model. No entitlement check
exists yet for AI features; add one when plans are enforced.

### Environment variables

| Variable | Required for | Notes |
| --- | --- | --- |
| `FACEBOOK_APP_ID` | Facebook Pages | Not secret, but keep in configuration |
| `FACEBOOK_APP_SECRET` | Facebook Pages | Server only |
| `SOCIAL_TOKEN_ENCRYPTION_KEY` | Facebook Pages | Format in §9 |
| `MARKETING_WEBHOOK_SECRET` | Delivery webhooks | At least 32 characters |
| `MARKETING_WORKER_SECRET` | Background worker | At least 32 characters |
| `AUTH_SECRET` | Unsubscribe links | Existing variable; changing it invalidates existing links |
| `GROQ_API_KEYS` / `OPENROUTER_API_KEY` / `GEMINI_API_KEYS` | AI copywriter | Any one |

## 10. Analytics definitions

All rates use stated denominators and return "No data" when the denominator is zero.

- **Accepted** = sent + delivered + bounced + complained (the provider took the message).
- **Delivery rate** = delivered ÷ accepted.
- **Bounce rate** = bounced ÷ accepted. **Complaint rate** = complained ÷ accepted.
- **Failure rate** = failed ÷ eligible recipients at approval (failed messages were never accepted).
- **Open rate (estimate)** = unique opens ÷ delivered. Mail privacy features and scanners inflate opens. Shown only when the
  provider reports opens. **Click rate** = unique clicks ÷ delivered, shown only when clicks are reported.
- **Unsubscribes** = unsubscribe confirmations attributed to the campaign.

## 11. Testing

```bash
npx vitest run tests/unit/marketing-domain.test.ts          # pure rules, schemas, crypto, tokens, signatures
npx vitest run tests/integration/marketing.test.ts          # contacts, tags, consent, audiences, campaigns, dispatch, webhooks, unsubscribe, tenancy
npx vitest run tests/integration/marketing-social-ai.test.ts # Facebook OAuth flow, social posts, AI copy (Meta and AI mocked)
npx vitest run tests/integration/marketing-routes.test.ts    # worker, webhook and callback route handlers
```

Integration tests need a MongoDB replica set on `127.0.0.1:27018` (see `tests/helpers/workspace.ts`). The
social and AI tests mock the Meta configuration, Graph API and AI provider. No real message, post or model call is made.

## 12. Known limitations

- Brevo has not been exercised against a live account from this repository. Every Brevo call is mocked in tests.
- Brevo webhooks are unauthenticated apart from the URL token. Delivery reporting is only as trustworthy as that token.
- Email marketing through the transactional endpoint is disabled until policy is confirmed.
- Facebook publishing and OAuth follow Meta's documented endpoints but were not exercised against a live Meta app.
- Rate limits and AI quotas are per process. They are not global across instances.
- Provider webhooks use a generic signed contract; no provider-specific verification exists.
- No token-rotation tool exists for `SOCIAL_TOKEN_ENCRYPTION_KEY`.
- Contact list search on free text uses an anchored-or-contains regex scoped by company; large companies need a text index.
- Pagination is page-based (skip). Deep pages get slower; keyset pagination is the next step.
- Standalone MongoDB (no replica set) runs multi-document writes with compensation. That is for development only.
- Calendar view for social posts is a chronological list, not a month grid.
- Audience evaluation is capped at 20,000 contacts; larger audiences must be narrowed.
- No contact merge or duplicate-resolution workflow. Two contacts with the same email in one company are blocked at creation; existing duplicates created by other means must be resolved by hand.
- No contact import (CSV). Contacts are created one at a time.
- No Instagram publishing, no provider-side revocation on disconnect, and no social post analytics.
