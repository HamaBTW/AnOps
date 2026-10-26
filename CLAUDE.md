Your Task:
# ANOPS — PHASE 1 IMPLEMENTATION: COMPLETE MARKETING, CAMPAIGNS & SOCIAL MANAGEMENT

## ROLE AND MISSION

Act as a senior full-stack SaaS engineer, software architect, application-security engineer, QA engineer, and UI/UX engineer.

Your task is to **fully implement, integrate, test, and harden Nesrine Derouiche's Marketing, Campaigns & Social Management module** in the existing AnOps application.

This is an implementation assignment, not a request for recommendations, a design proposal, a TODO list, or a mockup.

You must inspect the existing repository, reuse its established architectural patterns, implement all feasible requirements, run the relevant tests, fix the issues you discover, and report the actual results.

The final result must be a coherent, production-oriented module with functional CRUD operations, real persistence, strict multi-tenant isolation, robust business logic, responsive UI, and honest handling of external integrations.

Do not claim that something works unless you have verified it.

---

# 1. PROJECT CONTEXT — READ BEFORE CODING

AnOps is a modular, multi-tenant business-management SaaS platform inspired by products such as Odoo.

Nesrine's responsibility is:

**Marketing, Campaigns & Social Management**

The module must support:

- Contacts and leads.
- Contact tags and lifecycle stages.
- Channel-specific marketing consent and opt-outs.
- Dynamic or consistently maintained audiences.
- Reusable email and SMS templates.
- Marketing campaigns and recipient snapshots.
- Campaign scheduling and dispatch.
- Per-recipient delivery tracking.
- Delivery, bounce, open, click, unsubscribe, and failure events.
- Social account connections.
- Social post drafting, scheduling, and publishing where provider integration is genuinely available.
- AI-generated marketing copy that remains an editable draft until explicitly approved.
- Marketing analytics and reporting.
- Future integration with the existing CRM and Sales modules without creating competing customer identities.

## Current repository baseline

The latest repository audit reports:

- Next.js 16.4.2 with App Router.
- React 19.3.
- TypeScript 5.
- MongoDB Node.js driver 6.21.
- NextAuth v5 beta.
- Zod 4.
- React Hook Form.
- Tailwind CSS 4.
- Vitest.
- Existing company management, authentication, onboarding, active-company switching, and central permission infrastructure.
- Inventory, Purchasing, Manufacturing, and Finance modules already using the shared company-tenant model.
- CRM and Sales are currently stub pages according to the supplied audit.
- HR uses an older company-scoping pattern, so do not assume every older module is the correct architectural reference.

The audit reports that `docs/MULTI_TENANT_REPORT.md` contains the durable multi-tenant reference. Read it before changing code.

**These are starting assumptions, not a substitute for inspecting the current working tree.** The repository may have changed since the audit.

## Existing multi-tenant contract — preserve it

The established model is:

- `Company` is the tenant boundary.
- Every company-owned marketing document must include `companyId`.
- There is no `organizationId` tenant boundary in the current model; it was removed.
- The active company is resolved through `getActiveTenant()`, using the existing active-company cookie and live membership validation.
- `resolveWorkspace()` / `getPageWorkspace()` produce the established workspace context, including `db`, `userId`, `companyId`, `role`, `currencyCode`, and `permissions`.
- The existing route guard is implemented through `proxy.ts`.
- Company roles are mapped into the existing workspace role and central permission system.
- `src/server/security/permissions.ts` is the central permission catalogue.
- Services must enforce permissions, not rely exclusively on UI visibility.
- `tenantFilter(scope)` is the established query-scoping pattern.
- Existing modules use company-scoped indexes and company-specific data counters where appropriate.
- The company switcher already validates live memberships.

**Do not rebuild or replace this infrastructure.** Reuse it.

The Inventory, Purchasing, and Manufacturing implementations are the preferred references for the current architecture. Inspect Finance for recent conventions where useful.

Do not introduce another authentication system, database client, tenant abstraction, role system, or permission catalogue.

---

# 2. PHASE 0 — REPOSITORY AUDIT AND ARCHITECTURAL DISCOVERY

Before implementing anything, inspect the actual code.

Read at least:

- `docs/MULTI_TENANT_REPORT.md`.
- `package.json` and the TypeScript configuration.
- App Router structure and existing marketing-related routes.
- Shared layouts, sidebar/navigation, theme system, UI components, form patterns, tables, dialogs, and notifications.
- Authentication and session helpers.
- `proxy.ts`.
- Active-tenant resolution and workspace helpers.
- `src/server/security/permissions.ts` and existing permission-checking patterns.
- `tenantFilter(scope)` and representative tenant-scoped repositories/services.
- MongoDB client initialization, serialization conventions, indexes, and migrations or initialization procedures.
- Existing audit infrastructure.
- Existing AI service abstractions, model configuration, feature entitlements, and usage tracking.
- Existing email, SMS, social, webhook, and background-job infrastructure, if any.
- Existing tests and testing utilities.
- Existing CRM, Sales, and Contact/customer models, even if their pages are currently stubs.
- Existing environment-variable validation and configuration documentation.

Use the real file paths discovered in the repository. Do not assume the architecture follows a generic tutorial.

### Required audit outcome

Identify:

1. Existing marketing code and reusable components.
2. The established route, service, repository, validation, and permission conventions.
3. How companies are resolved and how active-company switching works.
4. Whether a canonical Contact or Customer model already exists.
5. Which external provider integrations and background-processing mechanisms actually exist.
6. Which environment variables are configured and which are missing, without printing secret values.
7. Which tests can run in the current environment.
8. Existing implementation gaps and risks.

Then proceed directly into implementation.

Do not stop after presenting the audit. Do not delete existing working functionality merely to make implementation easier.

---

# 3. REQUIRED DOMAIN MODEL

Use the supplied Marketing class diagram as the business reference, while adapting it to the existing MongoDB architecture.

Do not mechanically create a separate MongoDB collection for every UML class if the established architecture uses embedded documents, join collections, or other appropriate patterns.

Use the existing identifier conventions, timestamps, status enums, validation utilities, and serialization contracts.

The following domain capabilities must be implemented.

## 3.1 Contact

Required business fields include:

- `id`.
- `companyId`.
- `firstName`.
- `lastName`.
- `email`.
- `phone`.
- `source`.
- `lifecycleStage`.
- `isActive`.
- Creation and update timestamps.
- Optional additional fields only when justified by the existing application.

Implement complete, functional CRUD:

- Create contact.
- View contact details.
- List contacts with server-side pagination.
- Search by name, email, and phone.
- Filter by lifecycle stage, source, active status, and tags.
- Sort using an explicit allowlist.
- Edit contact.
- Activate/deactivate contact.
- Delete or archive contacts according to existing conventions and referential-integrity requirements.
- Validate and normalize contact information.
- Prevent inappropriate duplicate records within the same company.

Lifecycle stages should be a controlled set consistent with the CRM contract. At minimum, support meaningful stages such as lead, prospect, customer, and inactive where appropriate. Do not confuse lifecycle stage with tags.

Normalize email addresses consistently. Enforce appropriate company-scoped uniqueness or duplicate-detection rules without unnecessarily preventing legitimate contacts who share an address or phone number. If a contact merge or duplicate-resolution workflow is needed, implement it safely or document it as a limitation.

Do not expose unnecessary personal information in logs, analytics, AI prompts, or error messages.

## 3.2 Canonical contact identity and CRM integration

This requirement is essential.

Marketing must not create a competing customer/lead identity if the existing CRM or future CRM implementation already owns that identity.

Inspect current models first.

- If a canonical contact/customer entity already exists, reuse it.
- If CRM is currently a stub and no canonical entity exists, implement a clear canonical Contact identity contract that CRM and Sales can reuse later.
- Document the contract, identifiers, company ownership, lifecycle semantics, and integration boundary.
- Avoid introducing an unrelated duplicate customer collection simply to complete Marketing.
- Do not invent a cross-company global identity based solely on matching email addresses.
- If external contacts can be imported into multiple companies, keep their tenant-specific records isolated unless a deliberately designed shared-identity feature exists.

Marketing should be able to associate campaign activity with the canonical contact without duplicating the contact itself.

Design the service and repository boundaries so CRM can later consume the same identities and report campaign history.

## 3.3 Contact tags and assignments

Implement:

- Tag CRUD.
- Tag name, color, company scope, and timestamps.
- Assign tag to contact.
- Remove tag from contact.
- List tags for a contact.
- List contacts with a tag.
- Bulk tag assignment/removal where safe.
- Contact filters using one or more tags.

Requirements:

- Many-to-many relationships.
- Unique `(companyId, contactId, tagId)` assignment semantics, adapted to the actual schema.
- No duplicate assignments.
- Contact and tag must belong to the same active company.
- Reject foreign-company references.
- Handle tag deletion without leaving invalid assignments.
- Validate color values and prevent unsafe styling inputs.
- Use efficient indexed queries and avoid N+1 retrieval patterns.

A contact can have several tags simultaneously. Being a lead, VIP, or inactive should not require creating mutually exclusive tags or overwriting lifecycle state.

## 3.4 Consent records and suppression

Implement consent management by channel and purpose.

Supported channels should include the relevant email, SMS, and social/direct-marketing channels where appropriate.

Required fields include:

- Contact reference.
- Company scope, directly or through an enforceable parent relationship.
- Channel.
- Purpose.
- Consent status.
- Source.
- Recorded timestamp.
- Withdrawal timestamp when applicable.
- Relevant audit metadata.

Implement:

- View consent history.
- Record consent.
- Record withdrawal.
- View current effective consent.
- Prevent older events from silently overriding a more recent withdrawal.
- Record source and timestamps.
- Enforce appropriate authorization for changes.

Do not simply overwrite consent history. Preserve revocation history where required.

Build a central suppression/eligibility service used by all campaign recipient creation and dispatch workflows.

The service must consider:

- Effective consent for the exact channel and purpose.
- Current contact status.
- Invalid or missing destinations.
- Company-specific suppression lists.
- Unsubscribes and relevant bounce/complaint statuses.
- Campaign eligibility and provider requirements.

For direct marketing, absence of required permission must not be treated as permission.

Do not send campaigns to contacts who have opted out or lack the required legal basis. Do not treat consent for email as consent for SMS.

Implement unsubscribe handling with secure, non-guessable tokens or an equivalent safe mechanism, and make it idempotent.

Where provider requirements or applicable law require a different legal basis or workflow, make the policy explicit and configurable rather than claiming one universal consent rule fits every jurisdiction.

---

# 4. AUDIENCES AND RECIPIENT SELECTION

## 4.1 Audience CRUD

Implement:

- Create audience.
- View audience.
- List/search/filter audiences.
- Edit audience.
- Activate/deactivate audience.
- Delete audience safely.
- Show estimated eligible audience size.
- Preview matching contacts.
- Show exclusion counts and exclusion reasons where appropriate.

Each audience has:

- `id`.
- `companyId`.
- `name`.
- `description`.
- `selectionRule`.
- `isActive`.
- Timestamps.

## 4.2 Safe selection-rule engine

Support a clearly defined and validated subset of audience rules, such as:

- Lifecycle stage.
- Active status.
- Contact source.
- Assigned tags.
- Missing or present consent for a specific channel/purpose.
- Contact creation date where useful.

Use a structured, typed rule representation validated with Zod.

Do not accept arbitrary JavaScript, MongoDB query objects, executable expressions, or untrusted MongoDB operators from the client.

Provide a simple audience builder UI using supported rule types.

Audience membership must follow one documented strategy:

- Dynamic evaluation of validated selection rules; or
- Materialized membership maintained consistently.

Do not allow the UI to display one membership strategy while the backend implements another.

## 4.3 Audience members

Implement the `AudienceMember` relationship only if required by the chosen architecture.

If membership is materialized:

- Maintain membership consistently when contacts, tags, consent, or rules change.
- Prevent duplicate membership.
- Use company-scoped indexes.
- Provide a safe reconciliation/rebuild mechanism if needed.

If membership is evaluated dynamically, avoid unnecessary stored duplicates.

## 4.4 Campaign recipient snapshots

At the documented campaign approval, scheduling, or dispatch boundary, create a stable recipient snapshot.

Define the exact business rule and apply it consistently.

Requirements:

- Snapshot the selected contact IDs and the necessary destination values.
- Preserve the audience and selection criteria used.
- Record the snapshot time and relevant campaign version.
- Deduplicate recipients.
- Exclude ineligible contacts before generating delivery jobs.
- Never allow audience edits to silently rewrite an approved campaign's recipient set.
- Recheck consent, suppression, contact status, and other relevant eligibility rules immediately before actual delivery.
- Record exclusions so campaign statistics remain explainable.
- Ensure one contact cannot receive duplicate messages merely because it belongs to multiple matching tags or audience rules.

Snapshot data must be minimized and retained according to the application's privacy and retention policies.

---

# 5. CAMPAIGN MANAGEMENT

## 5.1 Campaign CRUD

Implement the following:

- Create campaign.
- List campaigns with pagination, search, filters, and sorting.
- View campaign details.
- Edit campaign drafts.
- Duplicate a campaign into a new draft.
- Delete a draft safely.
- Select an audience.
- Select an email or SMS channel.
- Select a compatible template.
- Configure campaign content.
- Preview content and recipients.
- Estimate eligible recipients.
- Submit for approval or approve according to the agreed permission workflow.
- Schedule a campaign.
- Cancel a scheduled campaign when cancellation is still possible.
- Dispatch through the real configured provider integration.
- View execution history, results, failures, and analytics.

Campaign fields include:

- `id`.
- `companyId`.
- `name`.
- `channel`.
- `status`.
- `scheduledAt`.
- `startedAt`.
- `completedAt`.
- `createdBy`.
- Timestamps.
- References to audience, template, snapshot, and relevant campaign version.

## 5.2 Campaign state machine

Define and enforce explicit valid transitions.

A reasonable initial lifecycle is:

`draft → pending_approval → approved → scheduled → processing → completed`

Additional transitions may include:

- `draft → cancelled`.
- `pending_approval → draft` when rejected or returned for revision.
- `approved → cancelled` before dispatch begins.
- `scheduled → cancelled` before dispatch begins.
- `processing → failed` only when the overall job cannot recover.
- `completed` remains terminal for that campaign execution.

Adapt names to existing conventions if needed, but document the final state machine.

Enforce transitions in server-side services, not only in UI buttons.

Prevent unauthorized approval, unauthorized dispatch, editing a locked campaign, and duplicate scheduling.

A campaign can complete even when some deliveries fail. Campaign lifecycle and per-recipient delivery status must remain separate.

Use versioning or equivalent safeguards so content cannot change unexpectedly after approval.

## 5.3 Campaign templates

Implement full template CRUD:

- Create template.
- List and search templates.
- View template.
- Edit template.
- Duplicate template.
- Activate/deactivate template.
- Delete template safely.
- Preview rendered content.

Required fields:

- `id`.
- `companyId`.
- `name`.
- `channel`.
- `subject` where relevant.
- `body`.
- `version`.
- `isActive`.
- Timestamps.

Enforce channel compatibility and valid versioning.

Validate template variables against an explicit allowlist, such as supported contact fields and unsubscribe links.

Never evaluate arbitrary template code or allow unsafe HTML/script injection.

For email HTML, sanitize output and use a safe rendering approach. Provide a plain-text alternative where supported.

For SMS, validate length and disclose the potential multipart message behavior where applicable.

---

# 6. REAL EMAIL AND SMS DELIVERY

This is an external integration, not a mock feature.

Inspect the repository for an existing provider abstraction and configured delivery services. Reuse them where appropriate.

If no suitable integration exists, create a clean provider interface, such as:

- `EmailProvider`.
- `SmsProvider`.

Implement an actual provider adapter only when the necessary SDK/API and configuration are available and can be tested safely.

Do not add several overlapping delivery libraries without a clear reason.

## 6.1 Provider configuration

The currently supplied Marketing environment variables include social-related secrets and Meta application credentials, but no confirmed email/SMS provider configuration has been provided.

Therefore:

- Discover any existing email/SMS provider configuration first.
- Do not assume that the application's account-verification email service is automatically a production marketing provider.
- Reuse a provider only if it supports the intended use case and is properly configured.
- If a provider is missing, finish the provider abstraction, validation, delivery tracking, and test adapter, but clearly mark real sending as unconfigured.
- Do not show a campaign as successfully sent merely because a test adapter accepted a message.

The application must visibly distinguish between a test/dry-run and real external delivery.

## 6.2 Delivery lifecycle

Implement delivery tracking with states such as:

- `pending`.
- `queued`.
- `sending`.
- `sent`.
- `delivered`.
- `failed`.
- `bounced`.
- `complained`.
- `suppressed`.

Use only the states relevant to the configured provider, and document their meanings.

Store:

- `id`.
- `companyId`.
- `campaignId`.
- `contactId`.
- Destination snapshot.
- Delivery status.
- Provider message ID.
- Timestamps.
- Safe error category/code where available.
- Attempt count and retry metadata.

Do not store sensitive provider payloads unnecessarily.

## 6.3 Sending safeguards

Implement:

- Background processing through the existing job infrastructure, if available.
- A recoverable, bounded queue or persisted job mechanism if no background system exists.
- Idempotent job processing.
- Stable idempotency keys.
- Controlled retries with exponential backoff and jitter.
- Provider-specific rate limiting.
- Connection/request timeouts.
- Maximum retry counts.
- Dead-letter or terminal failure handling.
- Graceful cancellation where possible.
- Concurrency-safe state transitions.
- Final eligibility and consent checks before sending.
- Accurate campaign aggregation from delivery records.

Do not run long-running dispatch loops inside an ordinary request handler.

Do not retry permanent errors indefinitely.

If the provider's API cannot guarantee exactly-once delivery, explain the limitations and design for safe deduplication and reconciliation.

## 6.4 Webhook processing

Implement secure provider webhook endpoints when an actual provider integration is configured.

- Verify signatures using the correct provider mechanism.
- Validate timestamps/replay windows where supported.
- Reject invalid signatures.
- Validate event structure.
- Resolve events to the correct provider message/delivery.
- Deduplicate provider events using provider event IDs or a stable equivalent.
- Store each valid event once.
- Make repeated webhook deliveries safe.
- Never trust a `companyId` supplied by an external webhook to establish tenant ownership.
- Resolve company scope through the existing delivery/provider mapping.
- Avoid leaking contact data in webhook responses and logs.

If provider configuration is missing, implement the internal webhook contract and tests where feasible, but do not claim that production webhooks have been verified.

---

# 7. SOCIAL ACCOUNT MANAGEMENT

Implement the `SocialAccount` domain:

- `id`.
- `companyId`.
- `platform`.
- `externalAccountId`.
- `connectionStatus`.
- `connectedAt`.
- Timestamps.
- Encrypted credential reference or encrypted token fields, depending on the existing security architecture.

Implement:

- List connected social accounts.
- View connection status.
- Start provider authorization.
- Complete OAuth callback with state validation.
- Disconnect account.
- Revoke or remove credentials as supported.
- Display connection errors and reauthorization requirements.
- Prevent a company from accessing another company's connected accounts.

## 7.1 Meta integration

The environment contains the following variable names:

- `FACEBOOK_APP_ID`.
- `FACEBOOK_APP_SECRET`.
- `SOCIAL_TOKEN_ENCRYPTION_KEY`.
- `MARKETING_WEBHOOK_SECRET`.

Their presence in `.env` is not proof that the values are valid or that a Meta developer application has been fully configured.

Do not print secret values, expose them to the browser, commit them, or include them in generated documentation.

Inspect existing configuration validation and integrate with it.

Implement Meta OAuth and account management only to the extent supported by the actual application configuration, selected API version, required permissions, and platform review requirements.

Distinguish between:

- Facebook Pages.
- Instagram professional accounts.
- Other Meta resources.

Do not assume that a Facebook login automatically authorizes every Instagram publishing capability.

Use least-privilege permissions and verify required account types, scopes, token lifetimes, publishing limitations, and current API capabilities against the provider's actual documentation when available.

OAuth must include:

- Cryptographically secure state validation.
- Correct redirect URI validation.
- Safe callback handling.
- No client-side secrets.
- Safe token storage.
- Correct company binding established through the initiating authenticated session.
- Rejection of unauthorized or replayed callbacks.

## 7.2 Token encryption

Use `SOCIAL_TOKEN_ENCRYPTION_KEY` only through server-side configuration.

Inspect its expected encoding and required cryptographic key length. Validate it at startup or when the integration is invoked.

Use authenticated encryption, such as AES-256-GCM, with a unique nonce/IV for every encryption operation and correct authentication-tag verification.

Never invent a default production key.

Never silently fall back to plaintext token storage.

Never return tokens in API responses, server-rendered props, logs, analytics, or client-side bundles.

Implement encryption/decryption tests, invalid-key handling, tamper detection, and safe rotation considerations.

Use a key version or another explicit mechanism if the design requires future key rotation.

If the configured key is missing or invalid, report the integration as unavailable and keep unrelated application functionality operational.

## 7.3 Publishing truthfulness

Social publishing is functional only if the correct provider integration is implemented, authorized, and configured.

Without that:

- Account connection must be reported as unavailable or unconfigured.
- Do not fabricate connected accounts.
- Do not pretend a post has been published.
- Do not generate fake external post IDs.
- Do not show a fake success toast.

Implement a clear connection setup and configuration state instead.

---

# 8. SOCIAL POST MANAGEMENT

Implement full CRUD for `SocialPost`:

- Create draft.
- List and filter posts.
- View post details.
- Edit draft.
- Delete draft.
- Choose a connected social account.
- Validate content against the target platform.
- Preview the content.
- Schedule a post.
- Cancel a scheduled post.
- Publish immediately where the real integration permits it.
- Track publication status.
- Store actual external post ID only after provider confirmation.
- Record publication timestamps and safe errors.

Fields:

- `id`.
- `companyId`.
- `socialAccountId`.
- `content`.
- `status`.
- `scheduledAt`.
- `publishedAt`.
- `externalPostId`.
- `createdBy`.
- Timestamps.

Use a clear state machine such as:

`draft → scheduled → publishing → published`

Include appropriate cancellation and failure states.

Validate that the selected social account belongs to the active company and supports the intended operation.

Scheduled publishing must use the background-job infrastructure, not a browser timer or a request that remains open until the scheduled time.

Implement retry and idempotency safeguards where supported. Avoid duplicate external publications when a provider request times out after the provider may have accepted it.

Never report success without provider confirmation.

---

# 9. AI MARKETING COPYWRITER

Reuse the existing shared server-side AI infrastructure if available.

Do not create a separate AI architecture, duplicate API keys, or call a model directly from the browser.

Implement the `AICopyGeneration` domain:

- `id`.
- `companyId`.
- `requestedBy`.
- `productDescription`.
- `targetAudience`.
- `channel`.
- `tone`.
- `generatedContent`.
- `status`.
- `createdAt`.
- Appropriate usage metadata.

## 9.1 AI functionality

Provide an accessible UI where a user can enter:

- Product/service description.
- Target audience.
- Channel.
- Tone.
- Optional campaign goal.
- Optional language, respecting the company configuration and existing application conventions.

Generate useful marketing drafts for supported channels.

For email, support subject and body where appropriate.

For SMS, generate concise copy that respects relevant length constraints.

For social posts, tailor content to the selected platform where that capability is configured.

## 9.2 Draft and approval workflow

AI output must never send, schedule, or publish automatically.

Required workflow:

`requested → generated_draft → edited → approved_for_use`

A user must explicitly choose to approve or use the draft.

If approval is intended to authorize an actual dispatch, use the proper campaign approval and authorization workflow separately.

Support:

- View generation history.
- View a generation.
- Edit generated content.
- Copy content.
- Regenerate with revised instructions.
- Save approved copy into a campaign draft or social post draft.
- Handle provider errors and usage limits.

Use structured output validation where supported.

Do not allow generated text to bypass consent rules, recipient suppression, sending limits, content moderation, permissions, or provider requirements.

## 9.3 Prompt injection and privacy

Treat contact records, imported content, campaign text, and all user-controlled context as untrusted input.

- Keep system instructions separate from user-provided data.
- Do not treat imported content as trusted instructions.
- Send only necessary context to the AI provider.
- Avoid transmitting unnecessary contact PII.
- Validate output before saving it.
- Handle refusals, malformed output, timeouts, and provider failures.
- Apply existing AI entitlements and usage controls if they exist.
- Track model usage and errors without recording unnecessary personal data.
- Do not fabricate AI output when the provider is unavailable.

If the shared AI service is not configured, provide a clear unavailable state and safe retry behavior rather than pretending content was generated.

---

# 10. MARKETING ANALYTICS AND REPORTING

Implement real analytics based on persisted campaign, delivery, and event records.

The Marketing dashboard should include relevant metrics such as:

- Total contacts.
- Active contacts.
- Contacts by lifecycle stage.
- Active audiences.
- Campaigns by state.
- Campaigns scheduled.
- Campaigns completed.
- Eligible recipients.
- Queued deliveries.
- Sent and delivered messages.
- Failed and bounced deliveries.
- Unsubscribe and complaint counts where available.
- Social posts by status.
- Published posts where provider-confirmed publication exists.
- AI generation usage where tracked.

Implement campaign-specific reporting:

- Recipient snapshot size.
- Eligible and suppressed counts.
- Pending, sent, delivered, failed, bounced, and complained counts where supported.
- Open and click events where the provider supports reliable reporting.
- Unsubscribe counts.
- Delivery and failure rates.
- Time-based reporting where useful.

Use precise denominators for every rate and document the definitions.

For example, do not calculate a delivery rate using contacts who were never eligible or deliveries that were never attempted without clearly labeling the metric.

Email open tracking is imperfect because of privacy features, image proxies, and automated scanners. Label open rates as estimates or provider-reported events rather than definitive proof that a person read an email.

Do not fabricate campaign performance, social engagement, or delivery metrics.

For metrics requiring unavailable provider data, show a clear unavailable state.

All analytics queries must be company-scoped, efficient, and indexed where justified.

Avoid retrieving every delivery record into application memory just to calculate a dashboard.

---

# 11. MULTI-TENANT SECURITY — NON-NEGOTIABLE

This is one of the most important requirements.

Every marketing feature must follow the existing AnOps multi-tenant contract.

## 11.1 Tenant resolution

Use the established active-company/workspace resolver and the current server-side authentication model.

Every protected operation must establish the authenticated user, active company, membership, workspace permissions, and relevant entitlement.

Do not accept `companyId` from client input as authoritative.

If a request includes a company ID, either ignore it in favor of the trusted workspace or validate it against the existing active-company and membership contract.

Never use a company ID from an untrusted form, URL, body, AI output, cookie, or webhook as a substitute for authorization.

## 11.2 Company scoping

Every company-owned marketing query must be scoped to the current company.

Use the existing `tenantFilter(scope)` pattern and established repository conventions.

Apply tenant scope to:

- Contacts.
- Tags and tag assignments.
- Consent records.
- Suppression records.
- Audiences and memberships.
- Campaigns.
- Templates.
- Recipient snapshots.
- Deliveries.
- Events.
- Social accounts.
- Social posts.
- AI generations.
- Analytics.
- Provider mappings.
- Background jobs.

For each related object, verify ownership before using its ID.

A company-A campaign must never reference a company-B audience, template, contact, social account, or delivery.

## 11.3 Authorization

Use the existing central permission catalogue.

If Marketing permissions are missing, add them through the established catalogue and role-mapping mechanism.

Define explicit capabilities, as appropriate, for:

- View marketing data.
- Manage contacts.
- Manage tags and audiences.
- Manage templates.
- Create/edit campaigns.
- Approve campaigns.
- Dispatch campaigns.
- Manage consent and suppression.
- Manage social connections.
- Publish social content.
- Generate AI content.
- View analytics.

Reuse existing role conventions and permission policies. Do not create an independent Marketing role system.

Every service that reads or mutates protected data must perform the relevant server-side authorization check.

Hiding buttons in the UI is not authorization.

Test both unauthorized access and cross-company access.

## 11.4 Additional security

Protect against:

- IDOR.
- Cross-tenant document references.
- MongoDB operator injection.
- NoSQL query injection.
- Mass assignment.
- XSS.
- CSRF where applicable.
- OAuth state forgery and replay.
- Webhook forgery and replay.
- Duplicate sends.
- Unsafe unsubscribe tokens.
- Secret leakage.
- Prompt injection.
- Excessive resource consumption.
- Unauthorized background dispatch.
- Unauthorized social publishing.
- Excessive AI usage.
- Leaked provider error details.

Use Zod to validate all untrusted inputs.

Use explicit DTOs and allowlisted update fields.

Never return raw MongoDB documents or provider secrets to clients.

Apply appropriate rate limits to AI generation, campaign creation/dispatch, imports, webhook handling, and other sensitive endpoints, using the existing infrastructure where available.

Return consistent, safe errors without exposing stack traces, internal database details, or secrets.

---

# 12. DATA INTEGRITY, INDEXES, AND PERFORMANCE

Use the repository's actual MongoDB conventions.

## 12.1 Indexing

Review existing index creation and initialization patterns.

Add justified indexes for common queries, including relevant combinations of:

- `companyId`.
- Contact email or normalized email.
- Contact lifecycle stage and active state.
- Contact tag assignment keys.
- Audience identity and membership.
- Campaign status and scheduled time.
- Campaign recipient snapshot identifiers.
- Delivery campaign/contact/status.
- Provider message identifiers.
- Provider event identifiers.
- Social account identity.
- Scheduled social post status/time.
- AI generation company/user/time.

Do not blindly create every possible compound index.

Ensure uniqueness constraints are company-scoped where appropriate.

Ensure provider event deduplication works under concurrent requests, using a unique index or an equivalent atomic mechanism.

Handle existing duplicate data before adding unique indexes.

## 12.2 Concurrency and idempotency

Ensure concurrent operations cannot create duplicate tag assignments, duplicate event records, duplicate recipients, or duplicate scheduling jobs.

Use atomic conditional updates, unique indexes, transactions where supported and appropriate, or established safe alternatives.

Do not assume all MongoDB deployments support transactions. Inspect the actual configuration.

Design recoverable behavior for partial failures across:

- Campaign scheduling.
- Recipient snapshot creation.
- Delivery-job creation.
- Provider dispatch.
- Provider webhook handling.
- Social post scheduling and publication.

If a multi-step operation can fail midway, provide a safe recovery or reconciliation strategy.

## 12.3 Performance

Implement:

- Server-side pagination.
- Search and filter validation.
- Indexed queries.
- Projections to return only required fields.
- Bounded list sizes.
- Bulk operations where safe.
- Efficient campaign aggregation.
- Avoidance of N+1 queries.
- Reuse of the shared MongoDB client.
- Bounded background-worker concurrency.
- Provider rate limits and timeouts.
- Reasonable AI output limits.

Avoid loading every contact or delivery into memory for routine operations.

Preserve existing performance patterns rather than adding unnecessary infrastructure.

---

# 13. USER INTERFACE AND ANOPS DESIGN IDENTITY

The module must look and feel like a native part of AnOps.

Do not create an unrelated visual design.

Reuse existing:

- Dashboard layout.
- Sidebar and navigation.
- Breadcrumbs.
- Typography.
- Spacing.
- Color tokens.
- Cards.
- Tables.
- Form components.
- Dialogs and drawers.
- Toast/notification system.
- Loading skeletons.
- Theme configuration.
- Responsive patterns.
- Accessibility conventions.

Use the existing icon library and components where appropriate.

## 13.1 Required navigation

Integrate Marketing into the existing dashboard navigation using its established patterns.

Organize the module logically, for example:

- Marketing Overview.
- Contacts.
- Tags.
- Audiences.
- Campaigns.
- Templates.
- Social Media.
- AI Copywriter.
- Analytics.
- Settings or Integrations, if the existing architecture supports them.

Use actual repository routing conventions and preserve current URLs where possible.

Do not introduce broken links, duplicate navigation entries, or inaccessible pages.

## 13.2 Required pages

Implement complete, usable pages for:

1. Marketing overview.
2. Contact list.
3. Contact create/edit/detail.
4. Tag management.
5. Audience list/create/edit/detail and membership preview.
6. Campaign list/create/edit/detail.
7. Campaign content and recipient preview.
8. Campaign approval and scheduling.
9. Campaign delivery details and event history.
10. Template list/create/edit/detail.
11. Social account list and connection flow.
12. Social post list/create/edit/detail and calendar if appropriate.
13. AI copywriter and generation history.
14. Campaign analytics.
15. Integration/configuration status where appropriate.

These must be real pages backed by actual services and data, not empty placeholders.

## 13.3 CRUD quality

For every applicable entity, verify:

- Create works and persists.
- Read works with correct authorization.
- Update works and persists.
- Delete/archive follows documented business rules.
- Lists refresh correctly after mutations.
- Search, filtering, sorting, and pagination work.
- Form validation shows useful field-level messages.
- Duplicate submissions are prevented where appropriate.
- Server errors are displayed safely.
- Loading states are visible.
- Empty states provide useful next actions.
- Destructive actions require confirmation.
- Success notifications reflect actual server success.

Do not ship decorative buttons or controls that do nothing.

## 13.4 Responsive design

Test at representative widths:

- 320–375 px.
- 390–430 px.
- 768 px.
- 1024 px.
- 1280–1440 px.
- 1920 px.

Ensure:

- Tables have a deliberate mobile presentation.
- Dialogs fit smaller screens.
- Forms remain usable.
- Filters do not overflow.
- The sidebar behaves consistently with the existing dashboard.
- Buttons have appropriate touch targets.
- Long names, emails, and content wrap safely.
- Campaign editors and previews remain usable.
- Charts remain legible.
- The page does not develop unintended horizontal scrolling.

Support the existing light and dark themes.

Use semantic HTML, accessible labels, keyboard navigation, visible focus states, and appropriate ARIA attributes where necessary.

## 13.5 Interaction quality

Avoid unnecessary page reloads and jarring transitions.

Use the existing data-fetching, mutation, and refresh patterns.

Prevent stale data, duplicate form submissions, race conditions in interactive filters, and state updates after components unmount.

Use optimistic updates only where rollback and error handling are implemented correctly.

Do not add excessive animations or dependencies.

---

# 14. BACKGROUND PROCESSING AND SCHEDULING

Campaign scheduling, email/SMS dispatch, and scheduled social publishing must not depend on a browser remaining open.

First, inspect existing background-job infrastructure.

If one exists, reuse it.

If none exists, choose the smallest reliable architecture compatible with the current deployment:

- Persist scheduled work in MongoDB.
- Claim jobs safely using atomic conditional updates and lease/lock metadata.
- Process jobs through an explicitly run worker or supported scheduled execution mechanism.
- Make jobs recoverable after process restarts.
- Use bounded retries and backoff.
- Record terminal failures.
- Reconcile expired leases.
- Prevent concurrent workers from processing the same job unsafely.
- Expose job status for observability.

Document the operational requirement for starting workers or configuring scheduled invocations.

Do not pretend that storing `scheduledAt` in MongoDB automatically executes the job.

Do not use unbounded in-process timers as the sole production scheduler.

If the current development environment cannot support a production worker, implement and test the processing contract, provide a safe local execution method, and explicitly document the deployment requirement.

---

# 15. TESTING REQUIREMENTS

Use the existing Vitest and testing conventions.

Do not replace the test framework or break existing suites unnecessarily.

Implement and run unit tests, integration tests, and end-to-end tests where supported.

Use deterministic fixtures and fake provider adapters in tests. Never send real marketing messages to real recipients during automated tests.

## 15.1 Contacts and tags

Test:

- Contact CRUD.
- Invalid input.
- Email normalization.
- Duplicate handling.
- Pagination and filtering.
- Multiple tags per contact.
- Duplicate tag assignment prevention.
- Tag removal.
- Cross-company contact/tag assignment rejection.
- Safe deletion/archive behavior.

## 15.2 Consent and suppression

Test:

- Consent recorded by channel and purpose.
- Withdrawal preserves history.
- Revoked consent prevents campaign eligibility.
- Missing required consent prevents eligibility.
- Email consent does not authorize SMS.
- Inactive contacts are excluded.
- Unsubscribed contacts are excluded.
- Suppression is rechecked immediately before delivery.
- Unsubscribe endpoint behavior is secure and idempotent.

## 15.3 Audiences and campaigns

Test:

- Audience rule validation.
- Audience preview.
- Recipient deduplication.
- Stable recipient snapshots.
- Snapshot isolation from later audience edits.
- Invalid campaign transitions.
- Unauthorized approval.
- Unauthorized dispatch.
- Concurrent scheduling attempts.
- Cancellation behavior.
- Correct campaign aggregation when some deliveries fail.

## 15.4 Deliveries and webhooks

Test:

- Provider adapter success and failure.
- Timeout behavior.
- Retry limits and backoff.
- Idempotent dispatch attempts.
- Duplicate webhook replay.
- Invalid webhook signatures.
- Unknown provider message IDs.
- Events associated with the correct delivery.
- Delivery updates remain tenant-safe.
- No fake success when providers are unavailable.

## 15.5 Social integrations

Test:

- Missing configuration.
- Invalid encryption key.
- Successful encrypt/decrypt round trip.
- Ciphertext or authentication-tag tampering.
- Tokens never appear in client DTOs.
- OAuth state mismatch.
- Invalid callback.
- Cross-company account access.
- Unauthorized publication.
- Duplicate scheduling protection.
- Provider failures do not produce false success.

## 15.6 AI

Test:

- Valid draft generation using a fake provider.
- AI provider unavailable.
- Invalid model output.
- Unauthorized generation.
- Company isolation.
- AI usage limits where available.
- Prompt injection in user-controlled content.
- Draft remains a draft.
- Generated content cannot automatically dispatch.
- Content can be saved to a campaign draft without creating duplicate identities.

## 15.7 Regression and build

Verify:

- Existing authentication still works.
- Email verification and password reset remain intact.
- Onboarding and company creation still work.
- Company switching still works.
- Marketing access changes with the active company.
- Existing Inventory, Purchasing, Manufacturing, Finance, and HR flows are not broken.
- Existing permission conventions remain compatible.

The existing report states that 29 unit tests passed and five integration suites could not run because a local MongoDB replica set on port 27018 was unavailable. Check the current environment rather than assuming that is still true.

If integration tests require that replica set and it is unavailable, run all feasible tests, report the blocker accurately, and provide the exact setup needed. Do not silently skip or falsely pass those tests.

---

# 16. IMPLEMENTATION ORDER

Execute this work in the following sequence.

## Phase A — Audit and architecture

- Inspect repository and current changes.
- Read the multi-tenant report.
- Map existing shared infrastructure.
- Identify canonical contact identity.
- Define the final Marketing route, permission, data, and provider contracts.

## Phase B — Foundation

- Add or adapt Marketing domain types and Zod schemas.
- Implement tenant-scoped repositories and services.
- Implement permission checks.
- Add justified indexes.
- Implement audit events through existing infrastructure.
- Implement provider interfaces and validated configuration.
- Add core unit tests.

## Phase C — Contacts, tags, consent, and audiences

- Complete Contact CRUD.
- Complete tag CRUD and assignments.
- Complete consent history and suppression.
- Complete Audience CRUD and rule evaluation.
- Implement recipient eligibility and deduplication.

## Phase D — Templates and campaigns

- Complete template CRUD and safe rendering.
- Complete campaign CRUD and state transitions.
- Implement campaign approval and recipient snapshots.
- Implement campaign reporting contracts.

## Phase E — Dispatch infrastructure

- Integrate configured email/SMS providers where possible.
- Implement persisted jobs, retry, idempotency, and webhook contracts.
- Implement real dispatch only when configuration and integration are valid.
- Ensure unavailable integrations are represented honestly.

## Phase F — Social and AI

- Implement SocialAccount management.
- Implement secure provider connection flows where supported.
- Implement SocialPost CRUD and scheduling.
- Integrate real publishing only where provider authorization and capabilities permit it.
- Implement AI copywriting through the existing server-side AI service.
- Ensure AI content remains a draft until approval.

## Phase G — UI and analytics

- Integrate navigation and routes.
- Complete responsive pages and forms.
- Implement real dashboard and campaign analytics.
- Add clear integration and unavailable states.
- Verify light/dark themes and accessibility.

## Phase H — Hardening and verification

- Run tenant-isolation tests.
- Run acceptance and regression tests.
- Run lint, typecheck, and production build.
- Fix issues introduced by this implementation.
- Inspect the final diff.
- Update documentation and configuration examples.

Do not stop after any one phase. Continue through all phases that can be completed in the current environment.

---

# 17. DOCUMENTATION AND ENVIRONMENT CONFIGURATION

Update the relevant existing documentation rather than creating redundant documentation files.

Document:

- Marketing architecture.
- Domain entities and relationships.
- Canonical contact identity and CRM integration contract.
- Routes and service boundaries.
- Tenant-scoping and permission rules.
- Campaign state machine.
- Consent and suppression semantics.
- Recipient snapshot policy.
- Delivery lifecycle.
- Background-job operation.
- Provider configuration and setup.
- Meta OAuth prerequisites and required permissions.
- Encryption-key format and rotation considerations.
- Webhook configuration.
- AI configuration and entitlements.
- Analytics definitions.
- Test commands and known limitations.

Update `.env.example` or the repository's equivalent with variable names and safe placeholder descriptions only.

Potentially relevant existing variable names include:

- `SOCIAL_TOKEN_ENCRYPTION_KEY`
- `MARKETING_WEBHOOK_SECRET`
- `FACEBOOK_APP_ID`
- `FACEBOOK_APP_SECRET`

Verify the actual environment-validation schema before introducing or changing configuration.

Discover and document any missing email, SMS, AI, OAuth callback, or worker configuration needed by the implementation.

Never copy actual `.env` values into documentation, tests, source files, command output, or the final report.

Do not rotate, overwrite, or otherwise modify production credentials without explicit authorization.

---

# 18. ACCEPTANCE CRITERIA — WHEN IS THIS MODULE DONE?

The module is complete only when the following criteria are met, or any remaining environmental limitations are clearly documented.

1. Every required domain entity has a coherent implementation.
2. All applicable CRUD workflows persist data and enforce validation.
3. The active company is the trusted tenant scope.
4. Cross-company access is rejected at service/API level.
5. Permissions are enforced server-side.
6. Contact tags are many-to-many and duplicate-safe.
7. Consent is channel- and purpose-specific, with revocation history.
8. Suppression rules prevent ineligible marketing deliveries.
9. Audience rules are validated and recipient snapshots are stable.
10. Campaign and delivery states are separate and correctly enforced.
11. Provider dispatch is idempotent and retry-safe within the guarantees of the provider.
12. Provider events are authenticated where supported and deduplicated.
13. Social credentials are encrypted server-side and never exposed to clients.
14. Social publication is never reported as successful without provider confirmation.
15. AI content remains a draft until the proper approval workflow authorizes its use.
16. Analytics use actual persisted data and correctly defined metrics.
17. UI pages are fully integrated with AnOps navigation and theme.
18. Forms, dialogs, lists, filters, loading states, errors, and empty states work.
19. The application remains responsive across the required viewport sizes.
20. Relevant unit, integration, security, and regression tests pass.
21. Lint, TypeScript checks, and production build pass, or exact pre-existing/environmental blockers are identified.
22. Documentation reflects the actual implementation.
23. No secrets, fake production data, false delivery success, placeholder CRUD actions, or unimplemented controls are presented as functional.

A provider that has not been configured must remain visibly unconfigured. This does not justify leaving unrelated Marketing CRUD functionality unfinished.

Do not claim 100% completion if any acceptance criterion remains unverified.

---

# 19. REQUIRED FINAL REPORT

After implementation, provide a concise but technically detailed report containing:

### A. Implementation summary
What was implemented, what already existed, and what was improved.

### B. Routes and UI
All implemented routes, screens, CRUD workflows, responsive behavior, and navigation changes.

### C. Backend architecture
Repositories, services, validation schemas, API handlers/server actions, permissions, and background processing.

### D. Data model
Collections or document structures, relationships, tenant scoping, indexes, and identity integration.

### E. Security
Authorization, cross-company isolation, consent/suppression, token encryption, webhook security, and AI safeguards.

### F. Integrations
For each email, SMS, social, and AI provider, state one of:

- Implemented and verified.
- Implemented but awaiting configuration.
- Partially implemented with exact limitations.
- Not implemented, with reason and required next step.

### G. Tests and verification
List actual commands executed, tests passed/failed, build results, and any tests blocked by unavailable services.

### H. Changed files
Summarize the important files created or modified.

### I. Remaining work
List all unresolved issues, provider prerequisites, deployment requirements, and known limitations.

### J. Final assessment
State which acceptance criteria are verified and which remain unverified. Never report a successful build, passing test, successful external delivery, or complete provider integration without evidence.

---

# FINAL EXECUTION INSTRUCTIONS

Begin by inspecting the actual repository and reading `docs/MULTI_TENANT_REPORT.md`.

Reuse the existing company-management logic and the established Inventory/Purchasing/Manufacturing tenant-scoped patterns. Preserve the current AnOps architecture, conventions, branding, and working features.

Implement the full Marketing module in the existing codebase. Do not generate a disconnected sample application or merely create frontend mockups.

Prioritize correctness, tenant isolation, security, data integrity, accessibility, responsive design, performance, maintainability, and genuine functionality over unnecessary complexity.

Do not ask me to repeat information already available in the repository or this prompt. If a requirement depends on an unavailable provider credential or service, complete everything that can safely be completed, identify the exact blocker, and continue with the other requirements.

**Start the repository audit now, then implement, test, fix, and verify the entire Marketing, Campaigns & Social Management module.**