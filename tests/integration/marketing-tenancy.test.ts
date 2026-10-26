/**
 * Marketing Multi-Tenant Isolation Tests
 *
 * Proves that Company A data cannot be read or mutated by Company B across all
 * marketing collections: contacts, tags, consents, audiences, templates,
 * campaigns, social accounts, and deliveries.
 *
 * Requires a MongoDB replica set on port 27018 (for transactions).
 * Run: MONGODB_TEST_URI=mongodb://127.0.0.1:27018/?replicaSet=rs0&directConnection=true npm test
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import { createHarness } from "../helpers/workspace";
import type { TestHarness } from "../helpers/workspace";

// ── import-time db wiring (same pattern as hr-tenancy.test.ts) ──────────────
const BASE_URI =
  process.env.MONGODB_TEST_URI ??
  "mongodb://127.0.0.1:27018/?replicaSet=rs0&directConnection=true";
const DB_SUFFIX = `marketing_iso_${new ObjectId().toHexString()}`;
const url = new URL(BASE_URI);
url.pathname = `/${DB_SUFFIX}`;
process.env.MONGODB_URI = url.toString();
process.env.AUTH_SECRET ??= "marketing-isolation-test-secret-0123456789abcdef";
process.env.SOCIAL_TOKEN_ENCRYPTION_KEY = "FcHeZ7E6GbEfSfXnXqMTNxAe7yO6+iBounl6aV78MmE=";

// ── service-level imports (loaded after env is wired) ───────────────────────
type MarketingService = typeof import("@/server/services/marketing.service");
type SocialAccountService = typeof import("@/server/services/social-account.service");
type SocialService = typeof import("@/server/services/social.service");

let marketing: MarketingService;
let socialAccounts: SocialAccountService;
let social: SocialService;
let harness: TestHarness;

// IDs owned by Company A
let contactA: string;
let tagA: string;
let audienceA: string;
let templateA: string;
let campaignA: string;

beforeAll(async () => {
  harness = await createHarness();
  marketing = await import("@/server/services/marketing.service");
  socialAccounts = await import("@/server/services/social-account.service");
  social = await import("@/server/services/social.service");

  const ctxA = harness.ctx("owner");

  // Create a tag for Company A
  const tag = await marketing.createTag(ctxA, { name: "VIP", color: "#c8f03e" });
  tagA = tag.id;

  // Create contact for Company A
  const contact = await marketing.createContact(ctxA, {
    firstName: "Amina",
    lastName: "Belkacem",
    email: "amina@company-a.example",
    source: "website",
    lifecycleStage: "lead",
    tagIds: [tagA],
  });
  contactA = contact.id;

  // Create audience for Company A
  const audience = await marketing.createAudience(ctxA, {
    name: "Company A Newsletter",
    description: "All active leads",
  });
  audienceA = audience.id;

  // Create template for Company A
  const template = await marketing.createTemplate(ctxA, {
    name: "Welcome",
    channel: "email",
    subject: "Welcome to Company A!",
    body: "Hi {{firstName}}, welcome to Company A!",
    description: "",
  });
  templateA = template.id;

  // Create campaign for Company A
  const campaign = await marketing.createCampaign(ctxA, {
    name: "Summer Campaign A",
    channel: "email",
    subject: "Summer deals",
    body: "Check our summer offers",
    audienceId: audienceA,
  });
  campaignA = campaign.id;
});

afterAll(async () => {
  await harness?.cleanup();
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. CONTACTS — Company B cannot see or mutate Company A contacts
// ─────────────────────────────────────────────────────────────────────────────

describe("Contact isolation", () => {
  it("Company B cannot list Company A contacts", async () => {
    const ctxB = harness.otherTenant("owner");
    const result = await marketing.listContacts(ctxB, {});
    expect(result.items.map((c) => c.id)).not.toContain(contactA);
    expect(result.total).toBe(0);
  });

  it("Company B cannot read Company A contact by id", async () => {
    const ctxB = harness.otherTenant("owner");
    await expect(marketing.getContact(ctxB, contactA)).rejects.toThrow(/not found/i);
  });

  it("Company B cannot update Company A contact", async () => {
    const ctxB = harness.otherTenant("owner");
    await expect(
      marketing.updateContact(ctxB, contactA, { firstName: "Hacked" })
    ).rejects.toThrow(/not found/i);
  });

  it("Company B cannot archive Company A contact", async () => {
    const ctxB = harness.otherTenant("owner");
    await expect(
      marketing.archiveContact(ctxB, contactA)
    ).rejects.toThrow(/not found/i);
  });

  it("Company B can create its own independent contact", async () => {
    const ctxB = harness.otherTenant("owner");
    const contact = await marketing.createContact(ctxB, {
      firstName: "Sami",
      lastName: "Ben Ali",
      email: "sami@company-b.example",
      source: "import",
      lifecycleStage: "lead",
      tagIds: [],
    });
    expect(contact.id).toBeTruthy();
    expect(contact.companyId).toBe(ctxB.companyId.toHexString());
    // Company A cannot see it
    const ctxA = harness.ctx("owner");
    const listA = await marketing.listContacts(ctxA, {});
    expect(listA.items.map((c) => c.id)).not.toContain(contact.id);
  });

  it("Duplicate email within same company is rejected; cross-company is allowed", async () => {
    const ctxA = harness.ctx("owner");
    await expect(
      marketing.createContact(ctxA, {
        firstName: "Dupe",
        lastName: "Test",
        email: "amina@company-a.example", // same as contactA
        source: "test",
        lifecycleStage: "lead",
        tagIds: [],
      })
    ).rejects.toThrow(/already exists/i);

    // Company B with same email is fine
    const ctxB = harness.otherTenant("owner");
    await expect(
      marketing.createContact(ctxB, {
        firstName: "Cross",
        lastName: "Tenant",
        email: "amina@company-a.example",
        source: "test",
        lifecycleStage: "lead",
        tagIds: [],
      })
    ).resolves.toMatchObject({ email: "amina@company-a.example" });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. TAGS — Company B cannot see Company A tags
// ─────────────────────────────────────────────────────────────────────────────

describe("Tag isolation", () => {
  it("Company B cannot list Company A tags", async () => {
    const ctxB = harness.otherTenant("owner");
    const tags = await marketing.listTags(ctxB);
    expect(tags.map((t) => t.id)).not.toContain(tagA);
  });

  it("Company B cannot delete Company A tag", async () => {
    const ctxB = harness.otherTenant("owner");
    // deleteTag returns false (not found) rather than throwing for missing tag
    const deleted = await marketing.deleteTag(ctxB, tagA);
    expect(deleted).toBe(false);
  });

  it("Tag names are namespaced per company — same name allowed in both", async () => {
    const ctxB = harness.otherTenant("owner");
    const tag = await marketing.createTag(ctxB, { name: "VIP", color: "#ff0000" });
    expect(tag.id).toBeTruthy();
    expect(tag.id).not.toBe(tagA);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. AUDIENCES — Company B cannot see or modify Company A audiences
// ─────────────────────────────────────────────────────────────────────────────

describe("Audience isolation", () => {
  it("Company B cannot list Company A audiences", async () => {
    const ctxB = harness.otherTenant("owner");
    const audiences = await marketing.listAudiences(ctxB);
    expect(audiences.map((a) => a.id)).not.toContain(audienceA);
  });

  it("Company B cannot add members to Company A audience", async () => {
    const ctxB = harness.otherTenant("owner");
    // contactA belongs to Company A; adding to Company A's audience from Company B context should fail
    await expect(
      marketing.addAudienceMember(ctxB, audienceA, contactA)
    ).rejects.toThrow(/not found/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. TEMPLATES — Company B cannot read Company A templates
// ─────────────────────────────────────────────────────────────────────────────

describe("Template isolation", () => {
  it("Company B cannot list Company A templates", async () => {
    const ctxB = harness.otherTenant("owner");
    const templates = await marketing.listTemplates(ctxB);
    expect(templates.map((t) => t.id)).not.toContain(templateA);
  });

  it("Company B cannot archive Company A template", async () => {
    const ctxB = harness.otherTenant("owner");
    const result = await marketing.archiveTemplate(ctxB, templateA);
    expect(result).toBe(false);
  });

  it("Company B cannot duplicate Company A template", async () => {
    const ctxB = harness.otherTenant("owner");
    await expect(marketing.duplicateTemplate(ctxB, templateA)).rejects.toThrow(/not found/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. CAMPAIGNS — Company B cannot see or command Company A campaigns
// ─────────────────────────────────────────────────────────────────────────────

describe("Campaign isolation", () => {
  it("Company B cannot list Company A campaigns", async () => {
    const ctxB = harness.otherTenant("owner");
    const campaigns = await marketing.listCampaigns(ctxB);
    const ids = Array.isArray(campaigns) ? campaigns.map((c: any) => c.id) : (campaigns as any).items?.map((c: any) => c.id) ?? [];
    expect(ids).not.toContain(campaignA);
  });

  it("Company B cannot get Company A campaign", async () => {
    const ctxB = harness.otherTenant("owner");
    await expect(marketing.getCampaign(ctxB, campaignA)).rejects.toThrow(/not found/i);
  });

  it("Company B cannot advance Company A campaign state", async () => {
    const ctxB = harness.otherTenant("owner");
    await expect(marketing.transitionCampaign(ctxB, campaignA, "submit")).rejects.toThrow(
      /not found/i
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. CONSENT — records strictly scoped to their company
// ─────────────────────────────────────────────────────────────────────────────

describe("Consent isolation", () => {
  let grantedId: string;

  it("Company A can grant consent for Company A contact", async () => {
    const ctxA = harness.ctx("owner");
    const record = await marketing.recordConsent(ctxA, contactA, {
      channel: "email",
      purpose: "newsletter",
      status: "granted",
      source: "signup_form",
    });
    grantedId = record.id;
    expect(record.contactId).toBe(contactA);
  });

  it("Company B cannot list Company A contact consent history", async () => {
    const ctxB = harness.otherTenant("owner");
    // listConsentHistory scopes by companyId — returns empty for cross-tenant
    const history = await marketing.listConsentHistory(ctxB, contactA);
    expect(history).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. SOCIAL ACCOUNTS — secrets never returned in client projections
// ─────────────────────────────────────────────────────────────────────────────

describe("Social account secret protection", () => {
  let accountId: string;

  it("stores a social account and returns no secret fields", async () => {
    const ctxA = harness.ctx("owner");

    // socialAccountMetadataSchema is applied inside; we pass the raw object
    const account = await socialAccounts.storeSocialAccount(ctxA, {
      platform: "facebook",
      providerAccountId: "fb-page-001",
      displayName: "Farmy Page",
      accessToken: "super-secret-access-token-abc123",
      scopes: ["pages_show_list", "pages_read_engagement"],
    });

    accountId = account.id;
    expect(account.id).toBeTruthy();
    // The returned shape must NOT contain token fields
    expect(account).not.toHaveProperty("accessToken");
    expect(account).not.toHaveProperty("encryptedAccessToken");
    expect(account).not.toHaveProperty("encryptedRefreshToken");
    expect(account.connectionStatus).toBe("connected");
  });

  it("listSocialAccounts never exposes token fields", async () => {
    const ctxA = harness.ctx("owner");
    const list = await socialAccounts.listSocialAccounts(ctxA);
    const found = list.find((a) => a.id === accountId);
    expect(found).toBeDefined();
    expect(found).not.toHaveProperty("accessToken");
    expect(found).not.toHaveProperty("encryptedAccessToken");
    expect(found).not.toHaveProperty("encryptedRefreshToken");
  });

  it("Company B cannot see Company A social accounts", async () => {
    const ctxB = harness.otherTenant("owner");
    const list = await socialAccounts.listSocialAccounts(ctxB);
    expect(list.map((a) => a.id)).not.toContain(accountId);
  });

  it("Company B cannot disconnect Company A social accounts", async () => {
    const ctxB = harness.otherTenant("owner");
    await expect(socialAccounts.disconnectSocialAccount(ctxB, accountId)).resolves.toBe(false);

    const account = await harness.db.collection("marketing_social_accounts").findOne({
      _id: new ObjectId(accountId),
    });
    expect(account?.connectionStatus).toBe("connected");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. SOCIAL POSTS — Company B cannot read or mutate Company A posts
// ─────────────────────────────────────────────────────────────────────────────

describe("Social post isolation", () => {
  let postA: string;

  it("Company A can create a social draft", async () => {
    const post = await social.createSocialPost(harness.ctx("owner"), {
      content: "A company-only LinkedIn update.",
      platform: "linkedin",
    });
    postA = post.id;
    expect(post.companyId).toBe(harness.ctx("owner").companyId.toHexString());
  });

  it("Company B cannot list, read, update, or transition Company A posts", async () => {
    const ctxB = harness.otherTenant("owner");
    await expect(social.listSocialPosts(ctxB)).resolves.not.toContainEqual(expect.objectContaining({ id: postA }));
    await expect(social.getSocialPost(ctxB, postA)).rejects.toThrow(/not found/i);
    await expect(
      social.updateSocialPost(ctxB, postA, {
        content: "Cross-company change attempt.",
        platform: "linkedin",
      })
    ).rejects.toThrow(/draft social posts can be edited/i);
    await expect(social.transitionSocialPost(ctxB, postA, "submit")).rejects.toThrow(/current state/i);

    await expect(social.getSocialPost(harness.ctx("owner"), postA)).resolves.toMatchObject({
      content: "A company-only LinkedIn update.",
      status: "draft",
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. RBAC — viewer-role cannot manage contacts
// ─────────────────────────────────────────────────────────────────────────────

describe("RBAC enforcement", () => {
  it("viewer cannot create contacts", async () => {
    const ctxViewer = harness.ctx("viewer");
    await expect(
      marketing.createContact(ctxViewer, {
        firstName: "Hack",
        lastName: "Attempt",
        email: "hack@viewer.example",
        source: "test",
        lifecycleStage: "lead",
        tagIds: [],
      })
    ).rejects.toThrow(/permission/i);
  });

  it("viewer can list contacts (read-only access)", async () => {
    const ctxViewer = harness.ctx("viewer");
    const result = await marketing.listContacts(ctxViewer, {});
    // Should succeed with read permission
    expect(result).toHaveProperty("items");
  });

  it("operator cannot approve a campaign", async () => {
    const ctxOp = harness.ctx("operator");
    // operator lacks MARKETING_CAMPAIGNS_APPROVE; approve should be blocked by RBAC
    // First create and submit a campaign as owner
    const ctxOwner = harness.ctx("owner");
    const aud = await marketing.createAudience(ctxOwner, { name: "RBAC Audience", description: "" });
    const campaign = await marketing.createCampaign(ctxOwner, {
      name: "RBAC Test Campaign",
      channel: "sms",
      body: "RBAC test message",
      audienceId: aud.id,
    });
    await marketing.transitionCampaign(ctxOwner, campaign.id, "submit");
    // Now try to approve as operator
    await expect(
      marketing.transitionCampaign(ctxOp, campaign.id, "approve")
    ).rejects.toThrow(/permission/i);
  });
});
