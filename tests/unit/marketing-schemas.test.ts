import { describe, expect, it } from "vitest";
import {
  contactInputSchema,
  contactUpdateSchema,
  contactQuerySchema,
  tagInputSchema,
  consentRecordSchema,
  audienceInputSchema,
  audienceSelectionRuleSchema,
  templateInputSchema,
  campaignInputSchema,
  campaignCommandSchema,
  membershipSchema,
} from "@/features/marketing/schemas/marketing.schema";
import { normalizeEmail, normalizePhone, normalizeTagName } from "@/server/services/marketing.service";

const OID = "64b000000000000000000001";
const OID2 = "64b000000000000000000002";

// ─────────────────────────────────────────────────────────────────────────────
// Normalizers
// ─────────────────────────────────────────────────────────────────────────────

describe("normalizeEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  Test@Example.COM  ")).toBe("test@example.com");
  });
  it("returns undefined for empty input", () => {
    expect(normalizeEmail("")).toBeUndefined();
    expect(normalizeEmail(null)).toBeUndefined();
    expect(normalizeEmail(undefined)).toBeUndefined();
  });
});

describe("normalizePhone", () => {
  it("strips non-digit characters but keeps leading +", () => {
    expect(normalizePhone("+33 6 12-34-56-78")).toBe("+33612345678");
  });
  it("returns undefined for empty/whitespace input", () => {
    expect(normalizePhone("")).toBeUndefined();
    expect(normalizePhone("   ")).toBeUndefined();
  });
});

describe("normalizeTagName", () => {
  it("lowercases and trims", () => {
    expect(normalizeTagName("  VIP Customer  ")).toBe("vip customer");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Contact schemas
// ─────────────────────────────────────────────────────────────────────────────

describe("contactInputSchema", () => {
  const base = {
    firstName: "Amina",
    lastName: "Belkacem",
    email: "amina@example.com",
    source: "website",
    lifecycleStage: "lead",
  };

  it("accepts a valid contact", () => {
    const result = contactInputSchema.parse(base);
    expect(result.firstName).toBe("Amina");
    expect(result.tagIds).toEqual([]);
  });

  it("trims whitespace from names", () => {
    const result = contactInputSchema.parse({ ...base, firstName: "  Amina  ", lastName: "  Belkacem  " });
    expect(result.firstName).toBe("Amina");
    expect(result.lastName).toBe("Belkacem");
  });

  it("rejects missing required first name", () => {
    expect(() => contactInputSchema.parse({ ...base, firstName: "" })).toThrow();
  });

  it("rejects invalid email", () => {
    expect(() => contactInputSchema.parse({ ...base, email: "not-an-email" })).toThrow();
  });

  it("accepts empty string email (optional)", () => {
    expect(() => contactInputSchema.parse({ ...base, email: "" })).not.toThrow();
  });

  it("rejects invalid lifecycle stage", () => {
    expect(() => contactInputSchema.parse({ ...base, lifecycleStage: "invalid_stage" })).toThrow();
  });

  it("rejects invalid tag IDs", () => {
    expect(() => contactInputSchema.parse({ ...base, tagIds: ["not-an-oid"] })).toThrow();
  });

  it("accepts valid tag IDs", () => {
    const result = contactInputSchema.parse({ ...base, tagIds: [OID, OID2] });
    expect(result.tagIds).toEqual([OID, OID2]);
  });

  it("caps tags at 50", () => {
    const ids = Array.from({ length: 51 }, () => OID);
    expect(() => contactInputSchema.parse({ ...base, tagIds: ids })).toThrow();
  });
});

describe("contactUpdateSchema", () => {
  it("is entirely optional", () => {
    expect(() => contactUpdateSchema.parse({})).not.toThrow();
  });

  it("accepts isActive boolean", () => {
    const result = contactUpdateSchema.parse({ isActive: false });
    expect(result.isActive).toBe(false);
  });
});

describe("contactQuerySchema", () => {
  it("defaults page=1, pageSize=20, active=true, sort=createdAt, direction=desc", () => {
    const result = contactQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.active).toBe("true");
    expect(result.sort).toBe("createdAt");
    expect(result.direction).toBe("desc");
  });

  it("coerces string numbers", () => {
    const result = contactQuerySchema.parse({ page: "3", pageSize: "50" });
    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(50);
  });

  it("rejects page sizes above 100", () => {
    expect(() => contactQuerySchema.parse({ pageSize: "101" })).toThrow();
  });

  it("accepts valid tagId filter", () => {
    const result = contactQuerySchema.parse({ tagId: OID });
    expect(result.tagId).toBe(OID);
  });

  it("rejects invalid tagId", () => {
    expect(() => contactQuerySchema.parse({ tagId: "invalid" })).toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tag schemas
// ─────────────────────────────────────────────────────────────────────────────

describe("tagInputSchema", () => {
  it("accepts valid tag", () => {
    const result = tagInputSchema.parse({ name: "VIP", color: "#ff0000" });
    expect(result.name).toBe("VIP");
    expect(result.color).toBe("#ff0000");
  });

  it("defaults color to #c8f03e", () => {
    const result = tagInputSchema.parse({ name: "Newsletter" });
    expect(result.color).toBe("#c8f03e");
  });

  it("rejects invalid hex color", () => {
    expect(() => tagInputSchema.parse({ name: "Tag", color: "red" })).toThrow();
    expect(() => tagInputSchema.parse({ name: "Tag", color: "#gg0000" })).toThrow();
    expect(() => tagInputSchema.parse({ name: "Tag", color: "#ff000" })).toThrow(); // too short
  });

  it("rejects empty name", () => {
    expect(() => tagInputSchema.parse({ name: "  " })).toThrow();
  });

  it("rejects names longer than 50 chars", () => {
    expect(() => tagInputSchema.parse({ name: "a".repeat(51) })).toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Consent schemas
// ─────────────────────────────────────────────────────────────────────────────

describe("consentRecordSchema", () => {
  it("accepts granted email consent", () => {
    const result = consentRecordSchema.parse({
      channel: "email",
      purpose: "newsletter",
      status: "granted",
      source: "signup_form",
    });
    expect(result.status).toBe("granted");
  });

  it("accepts revoked sms consent", () => {
    expect(() =>
      consentRecordSchema.parse({ channel: "sms", purpose: "promotions", status: "revoked", source: "unsubscribe" })
    ).not.toThrow();
  });

  it("rejects unknown channel", () => {
    expect(() =>
      consentRecordSchema.parse({ channel: "push", purpose: "news", status: "granted", source: "app" })
    ).toThrow();
  });

  it("rejects unknown status", () => {
    expect(() =>
      consentRecordSchema.parse({ channel: "email", purpose: "news", status: "pending", source: "form" })
    ).toThrow();
  });

  it("rejects empty purpose", () => {
    expect(() =>
      consentRecordSchema.parse({ channel: "email", purpose: "", status: "granted", source: "form" })
    ).toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Audience schemas
// ─────────────────────────────────────────────────────────────────────────────

describe("audienceInputSchema", () => {
  it("accepts a minimal audience", () => {
    const result = audienceInputSchema.parse({ name: "Newsletter Subs" });
    expect(result.name).toBe("Newsletter Subs");
    expect(result.description).toBe("");
    expect(result.selectionRule).toBeUndefined();
  });

  it("accepts a selection rule", () => {
    const result = audienceInputSchema.parse({
      name: "Active Leads",
      selectionRule: { activeOnly: true, lifecycleStages: ["lead", "customer"] },
    });
    expect(result.selectionRule?.lifecycleStages).toContain("lead");
  });

  it("rejects empty name", () => {
    expect(() => audienceInputSchema.parse({ name: "" })).toThrow();
  });
});

describe("audienceSelectionRuleSchema", () => {
  it("defaults activeOnly to true", () => {
    const result = audienceSelectionRuleSchema.parse({});
    expect(result.activeOnly).toBe(true);
  });

  it("rejects invalid tag IDs in rule", () => {
    expect(() => audienceSelectionRuleSchema.parse({ tagIds: ["bad-id"] })).toThrow();
  });
});

describe("membershipSchema", () => {
  it("accepts valid contact ID", () => {
    const result = membershipSchema.parse({ contactId: OID });
    expect(result.contactId).toBe(OID);
  });

  it("rejects invalid contact ID", () => {
    expect(() => membershipSchema.parse({ contactId: "not-valid" })).toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Template schemas
// ─────────────────────────────────────────────────────────────────────────────

describe("templateInputSchema", () => {
  it("accepts a valid email template", () => {
    const result = templateInputSchema.parse({
      name: "Welcome Email",
      channel: "email",
      subject: "Welcome to Farmy!",
      body: "Hi {{firstName}}, welcome!",
    });
    expect(result.name).toBe("Welcome Email");
  });

  it("accepts a valid SMS template", () => {
    expect(() =>
      templateInputSchema.parse({ name: "Promo SMS", channel: "sms", body: "Get 20% off today!" })
    ).not.toThrow();
  });

  it("rejects email template without subject", () => {
    expect(() =>
      templateInputSchema.parse({ name: "Test", channel: "email", body: "Body here" })
    ).toThrow(/subject/);
  });

  it("rejects SMS body exceeding 1600 chars", () => {
    expect(() =>
      templateInputSchema.parse({ name: "Long SMS", channel: "sms", body: "x".repeat(1601) })
    ).toThrow(/1,600/);
  });

  it("rejects empty body", () => {
    expect(() => templateInputSchema.parse({ name: "Empty", channel: "sms", body: "" })).toThrow();
  });

  it("rejects body over 10000 chars", () => {
    expect(() =>
      templateInputSchema.parse({ name: "Huge", channel: "email", subject: "Sub", body: "x".repeat(10001) })
    ).toThrow();
  });

  it("rejects unknown channel", () => {
    expect(() =>
      templateInputSchema.parse({ name: "Push", channel: "push", body: "Hello" })
    ).toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Campaign schemas
// ─────────────────────────────────────────────────────────────────────────────

describe("campaignInputSchema", () => {
  const base = {
    name: "Summer Sale",
    channel: "email",
    subject: "Big summer discounts!",
    body: "Hi {{firstName}}, check out our summer deals.",
    audienceId: OID,
  };

  it("accepts a valid campaign", () => {
    const result = campaignInputSchema.parse(base);
    expect(result.name).toBe("Summer Sale");
  });

  it("rejects missing name", () => {
    expect(() => campaignInputSchema.parse({ ...base, name: "" })).toThrow();
  });

  it("rejects invalid audienceId", () => {
    expect(() => campaignInputSchema.parse({ ...base, audienceId: "bad-id" })).toThrow();
  });

  it("rejects missing body", () => {
    expect(() => campaignInputSchema.parse({ ...base, body: "" })).toThrow();
  });

  it("rejects unknown channel", () => {
    expect(() => campaignInputSchema.parse({ ...base, channel: "push" })).toThrow();
  });

  it("accepts optional scheduledAt in ISO format", () => {
    const result = campaignInputSchema.parse({ ...base, scheduledAt: "2026-12-01T10:00:00Z" });
    expect(result.scheduledAt).toBe("2026-12-01T10:00:00Z");
  });

  it("rejects non-ISO scheduledAt", () => {
    expect(() => campaignInputSchema.parse({ ...base, scheduledAt: "December 1st 2026" })).toThrow();
  });
});

describe("campaignCommandSchema", () => {
  it("accepts all valid commands", () => {
    const commands = ["submit", "approve", "reject", "schedule", "dispatch", "cancel", "retry"];
    for (const command of commands) {
      expect(() => campaignCommandSchema.parse({ command })).not.toThrow();
    }
  });

  it("rejects unknown command", () => {
    expect(() => campaignCommandSchema.parse({ command: "send" })).toThrow();
    expect(() => campaignCommandSchema.parse({ command: "delete" })).toThrow();
  });
});
