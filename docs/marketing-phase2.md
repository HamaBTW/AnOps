# Marketing Phase 2 implementation notes

## Repository gaps and compatibility decisions

The current repository has authenticated users, but it does not yet expose an organization/company membership model, role-permission service, subscription entitlement service, job queue, webhook registry, AI provider, or test runner. Marketing records therefore use a server-derived `ownerEmail` scope as a temporary tenant boundary. Client payloads cannot choose that scope. This is intentionally documented as a compatibility fallback, not a replacement for the platform company model in the UML.

Before enabling cross-user company collaboration, replace `ownerEmail` in marketing repositories with the trusted company identifier resolved by the shared membership service and add company-aware compound indexes.

## Implemented in this increment

- Persistent MongoDB contacts with normalized email/phone duplicate protection.
- Server-side pagination, bounded search, deterministic sorting, lifecycle/source/active filters.
- Authenticated contact create, deactivate, and reactivate API operations.
- Repeatable contact, tag, audience membership, and consent indexes.
- Responsive contacts workspace at `/marketing/contacts` with validation, empty state, loading-safe submission, and mobile table overflow handling.
- Explicit audience creation/listing, duplicate-safe membership insertion, and consent history recording APIs with centralized eligibility counting for active contacts with granted email consent.
- Persisted campaign drafting, approval snapshotting, and server-enforced submit/approve/reject/schedule/cancel transitions at `/marketing/campaigns`.
- Persistent email/SMS template CRUD and archive/duplicate APIs plus a responsive Templates workspace at `/marketing/templates`.
- Campaign creation loads channel-compatible templates and copies selected subject/body content into the draft; later template edits do not affect that campaign.
- Draft campaign editing at `/marketing/campaigns/[id]` also loads compatible templates, applies content locally, and persists only after an explicit save.
- Delivery records can be queued for approved/scheduled campaigns through `/api/marketing/campaigns/:id/deliveries`; recipients are snapshotted only when active and granted channel consent, and the unavailable provider never reports sent/delivered.
- Campaign details now display persisted delivery counts/records with safe retry/cancel actions and refresh behavior.
- Delivery event normalization, idempotent event indexes, and persisted campaign analytics are available; the webhook route fails closed until a verified provider adapter and tenant association are configured.
- AI Copywriter workspace and history API are available at `/marketing/ai-copywriter` and `/api/marketing/ai-copy`; requests are validated and unavailable-provider attempts are persisted without fabricated output.
- Social publishing now has an independently runnable `npm run marketing:social-worker`, lease-based claims, and authenticated-encryption helpers for future credentials. No platform adapter or connected account is configured.
- Social account metadata APIs are ownership-scoped; credential storage requires `SOCIAL_TOKEN_ENCRYPTION_KEY`, and disconnect removes encrypted credentials. Publishing attempts are persisted with confirmed/failed outcomes.
- Facebook Pages capability detection and a fail-closed OAuth start boundary are available; no Meta application or authorized Page is configured, so no Facebook account is shown as connected or publishable.
- Facebook OAuth now uses encrypted, expiring, single-use state, server-side code exchange, Page discovery, permission checks, an owner-bound single-use multi-Page selection session, duplicate-safe account upserts, and encrypted account persistence. The Social Planner shows persisted connected Pages, binds posts to an eligible account, exposes sanitized attempt history, and moves uncertain provider outcomes to manual review rather than retrying them.
- Instagram Professional support now uses Instagram Login with encrypted OAuth state, server-side short-lived-to-long-lived token exchange, Business/Creator account validation, duplicate-safe account persistence, and a container-based image publishing adapter. Only public HTTPS image posts with captions are supported; Reels, Stories, carousels, video, and media hosting are intentionally unavailable.

## Pending integrations

Campaign delivery, provider webhooks, durable scheduling, consent/audience UI, social publication, and AI generation require the missing provider/job/permission contracts. Delivery queue records are durable and `npm run marketing:worker` is independently runnable, but no real provider is configured. Run `npm run test:integration` with a dedicated `MONGODB_TEST_URI` and test-named `MONGODB_TEST_DB`; otherwise the integration suite skips safely. A deployment must add provider credentials before dispatch is operational. A unique database record does not guarantee exactly-once external delivery.

Social publishing additionally requires `SOCIAL_TOKEN_ENCRYPTION_KEY`, a base64-encoded 32-byte server secret. Provider OAuth credentials, scopes, callback validation, and platform-specific adapters remain deployment work; the social worker fails a scheduled post safely when no adapter is configured. Definitive failures may be explicitly retried only after the server revalidates the future schedule and connected account; uncertain outcomes have no blind-retry action.

Facebook Pages requires `META_APP_ID`, `META_APP_SECRET`, `META_GRAPH_API_VERSION`, and an exact `META_OAUTH_CALLBACK_URL`, plus the encryption key. The required Page permissions, app review, test-user restrictions, and callback validation must be completed against a real Meta app before enabling OAuth. Automated tests must use HTTP test doubles; no real Meta credentials belong in source control.

Instagram requires `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, `INSTAGRAM_GRAPH_API_VERSION` (or `META_GRAPH_API_VERSION`), `INSTAGRAM_OAUTH_CALLBACK_URL`, and the encryption key. The selected authorization model is Instagram Login for Instagram Professional accounts, requesting `instagram_business_basic` and `instagram_business_content_publish`. The provider requires a public HTTPS image URL at publish time; this repository does not add a media-hosting service. A real account must complete Meta app configuration/review and be tested before enabling production publishing.

## Tests

Run `npm test` for the dependency-free Node test suite. Run `npm run test:integration` with both `MONGODB_TEST_URI` and `MONGODB_TEST_DB` set; the database name must contain `test`, otherwise the social suite fails closed and refuses to connect. Integration collections are run-scoped, indexed deterministically, and dropped only in the permitted test database. The suite covers delivery claims plus social claim concurrency, lease recovery, OAuth expiry/replay/owner binding, duplicate account keys, attempt-history isolation, and stale-worker protection. Without the explicit test database variables, integration cases are skipped and are not counted as passing.

## Social publishing operations

- Generate `SOCIAL_TOKEN_ENCRYPTION_KEY` with a cryptographically random base64-encoded 32-byte value. Rotate it with a planned credential re-encryption migration; losing it intentionally makes stored provider credentials unusable.
- Configure `META_APP_ID`, `META_APP_SECRET`, `META_GRAPH_API_VERSION`, and the exact `META_OAUTH_CALLBACK_URL`. Request only the Page scopes needed for the approved text-post capability, complete Meta app review, and use a test Page/user before production enablement.
- Start `npm run marketing:social-worker` as a separately supervised process. It claims scheduled posts with a two-minute lease, increments an atomic per-post attempt counter, and clears ownership only when the current claim matches.
- Definitive failures may be retried only when the schedule is still in the future and the connected Page is revalidated. Timeouts and ambiguous provider responses become `manual_review`; operators must reconcile in Meta before taking any external action. Never blindly retry an uncertain request.
- If a Page is disconnected, reconnect through OAuth and select the Page again. Existing posts retain their account reference and will not publish until the server sees a connected, eligible account.
- A controlled Meta test consists of one test user, one test Page with approved permissions, one short future-dated text post, worker logs containing no tokens, and confirmation of the returned provider post ID. No real Meta OAuth or publication has been verified in this repository yet.

The current production build failure is environmental: Next.js/Turbopack cannot create a process and bind its internal port under the restricted execution sandbox while processing CSS. TypeScript and ESLint pass; no unrelated build configuration was changed to mask this restriction.

## Phase 18D verification checklist

Automated verification uses mocked provider boundaries and must never contain live Meta credentials. For a controlled live test, configure the exact Facebook and Instagram callback URLs, use an authenticated test user and an authorized Business/Creator or Page asset, connect the account, verify that only redacted metadata is returned by the account API, schedule one approved test post, run the supervised social worker, confirm the provider ID on the real platform, then disconnect the account and verify subsequent attempts fail safely. Use approved test content only.

The current authorization boundary is authenticated-user ownership (`ownerEmail`), not company membership. The production design still requires a trusted company-membership resolver, active-membership checks, Marketing/Social Manager/admin permissions, company-scoped compound indexes, a migration from owner-email records, and cross-company denial tests. This phase does not invent or claim that model exists.

## Phase 19 identity and RBAC foundation

The repository now has `companies` and `company_memberships` collections with unique `(companyId, userId)` membership indexes, active/suspended/removed membership states, and roles `owner`, `admin`, `marketing_manager`, `marketing_operator`, and `viewer`. Permission checks are centralized in `src/server/authz/company.ts`; owner/admin membership mutations cannot assign the owner role, self-escalate, or remove the final active owner. Company management is available through `/api/companies` and `/api/companies/:id/members`, with a responsive `/settings/companies` workspace.

Existing users are assigned a personal workspace only through a server-side legacy migration helper keyed by their authenticated user record and normalized email. The helper adds `companyId` to existing owned Marketing documents without deleting or exposing records. It is repeatable and does not infer ownership from domains, names, browser state, or client input. Records that cannot be resolved must remain inaccessible until an administrator resolves them.

The current Marketing request boundary requires an active company membership before resolving Marketing scope, and social account/post routes require centralized social permissions. Marketing contacts, tags, audiences, audience members, consents, campaigns, templates, deliveries, delivery events, social accounts/posts/attempts, AI generations, and OAuth state records are persisted and queried with trusted `companyId` values. The repeatable legacy bootstrap backfills only records owned by the authenticated normalized email and leaves unresolved/orphan records inaccessible. Campaign workers and webhook ingestion preserve the company scope from the claimed or resolved parent record. Finance, HR, Inventory, Sales, CRM, and other modules are not migrated by this phase.

## Phase 19.2 explicit workspace context

The active workspace is selected with the `anops_active_company` server-managed cookie. It is `HttpOnly`, `SameSite=Lax`, path-scoped, time-limited, and secure in production. The cookie contains only a company identifier; every protected request still checks the live active membership, active company status, and server-side role/permission matrix. A user with multiple active memberships and no valid selection receives `COMPANY_REQUIRED`/a denied response instead of silently using the first membership. A user with exactly one eligible company may be initialized to that company by the authenticated companies endpoint.

Users switch workspaces through `POST /api/companies/active`, which accepts only a company ID, validates same-origin requests, confirms current membership and company status, then sets the cookie. `GET /api/companies/active` returns only eligible companies and the current selection. The shared dashboard top bar contains the responsive workspace switcher; successful changes reload the document so server-rendered data, forms, resource identifiers, and client state are discarded and refetched under the new context. Workers and webhooks do not use this cookie and continue resolving ownership from trusted persisted delivery/post records.

Membership suspension/removal and company deactivation are enforced on the next protected request. Invalid selections leave the prior cookie unchanged and return a generic authorization error. No client role, permission, or membership status is accepted by the switching API. Integration tests remain fail-closed and require a dedicated test-named `MONGODB_TEST_DB`; no production data is modified by the context implementation.