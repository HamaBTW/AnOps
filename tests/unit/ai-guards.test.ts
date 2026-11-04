import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AI_MODULES, AI_OPERATIONS, ceilingFor, clampToCeiling, roleAllows, violations } from "@/server/ai/access/capabilities";
import { defineTool } from "@/server/ai/tools/define-tool";
import { CORE_TOOLS } from "@/server/ai/tools/core.tools";
import { createToolRegistry } from "@/server/ai/tools/registry";
import { aiToolRegistry } from "@/server/ai/tools";
import { PERMISSIONS, permissionsForRole } from "@/server/security/permissions";
import { AI_PRESETS } from "@/shared/domain/ai";

const SRC = join(__dirname, "..", "..", "src");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? files(full) : /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

describe("AI data access is only through the scoped layer", () => {
  // Word-boundary on COLLECTIONS so MARKETING_COLLECTIONS.aiGenerations (an unrelated feature) is not matched.
  const AI_COLLECTION_PATTERN = /\bCOLLECTIONS\.ai[A-Z]|collection(<[^>]*>)?\(\s*["'`]ai_(settings|access_grants|conversations|pending_actions|usage|notices)["'`]/;
  const allowed = ["server/ai/data/", "server/db/documents.ts", "server/db/indexes.ts"];

  it("the pattern catches a real violation and ignores the unrelated marketing collection", () => {
    expect(AI_COLLECTION_PATTERN.test("db.collection(COLLECTIONS.aiConversations).find()")).toBe(true);
    expect(AI_COLLECTION_PATTERN.test('db.collection<Doc>("ai_pending_actions")')).toBe(true);
    expect(AI_COLLECTION_PATTERN.test("db.collection(MARKETING_COLLECTIONS.aiGenerations)")).toBe(false);
  });

  it("no file outside server/ai/data names an AI collection", () => {
    const offenders = files(SRC)
      .map((f) => relative(SRC, f))
      .filter((f) => !allowed.some((a) => f.startsWith(a) || f === a.replace(/\/$/, "")))
      .filter((f) => AI_COLLECTION_PATTERN.test(readFileSync(join(SRC, f), "utf8")));
    expect(offenders).toEqual([]);
  });

  it("only the transcript-audit service reaches another member's conversations", () => {
    const users = files(join(SRC, "server", "ai"))
      .map((f) => relative(SRC, f))
      .filter((f) => readFileSync(join(SRC, f), "utf8").includes("aiAuditReader("))
      .filter((f) => !f.startsWith("server/ai/data/"));
    expect(users).toEqual(["server/ai/transcript-audit.service.ts"]);
  });

  it("the AI path never imports the grant editor", () => {
    const offenders = files(join(SRC, "server", "ai", "tools"))
      .filter((f) => /saveMemberGrant|updateAiSettings/.test(readFileSync(f, "utf8")))
      .map((f) => relative(SRC, f));
    expect(offenders).toEqual([]);
  });
});

describe("tool registry guards", () => {
  const base = { module: "core" as const, operation: "view" as const, kind: "read" as const, risk: "low" as const, permission: null, description: "d", run: async () => ({ summary: "s" }) };

  it("rejects tenant and identity fields anywhere in an input schema, including nested ones", () => {
    for (const key of ["companyId", "userId", "role", "permissions", "organizationId"]) {
      const flat = defineTool({ ...base, name: "flat_tool", input: z.object({ [key]: z.string() }) as unknown as z.ZodType<unknown> });
      expect(() => createToolRegistry([flat])).toThrow(/must not accept/);
      const nested = defineTool({ ...base, name: "nested_tool", input: z.object({ filter: z.object({ [key]: z.string() }) }) as unknown as z.ZodType<unknown> });
      expect(() => createToolRegistry([nested])).toThrow(/must not accept/);
      const inArray = defineTool({ ...base, name: "array_tool", input: z.object({ items: z.array(z.object({ [key]: z.string() })) }) as unknown as z.ZodType<unknown> });
      expect(() => createToolRegistry([inArray])).toThrow(/must not accept/);
    }
  });

  it("requires writes to have a server-built summary, and destructive or financial ones a typed phrase", () => {
    const noSummary = defineTool({ ...base, name: "w_one", kind: "write", input: z.object({}) });
    expect(() => createToolRegistry([noSummary])).toThrow(/summarize/);
    const noPhrase = defineTool({ ...base, name: "w_two", kind: "write", risk: "destructive", input: z.object({}), summarize: () => "s" });
    expect(() => createToolRegistry([noPhrase])).toThrow(/typedPhrase/);
    const financial = defineTool({ ...base, name: "w_three", kind: "write", risk: "financial", input: z.object({}), summarize: () => "s" });
    expect(() => createToolRegistry([financial])).toThrow(/typedPhrase/);
    const risky = defineTool({ ...base, name: "r_one", risk: "sensitive", input: z.object({}) });
    expect(() => createToolRegistry([risky])).toThrow(/low risk/);
  });

  it("rejects duplicate and malformed names", () => {
    const t = defineTool({ ...base, name: "dup_tool", input: z.object({}) });
    expect(() => createToolRegistry([t, t])).toThrow(/Duplicate/);
    expect(() => createToolRegistry([defineTool({ ...base, name: "Bad Name", input: z.object({}) })])).toThrow(/Invalid/);
  });

  it("the production registry passes its own checks and exposes only Core and Inventory tools", () => {
    const names = aiToolRegistry.all().map((t) => t.name);
    expect(names.slice(0, CORE_TOOLS.length)).toEqual(CORE_TOOLS.map((t) => t.name));
    expect(aiToolRegistry.all().every((t) => t.module === "core" || t.module === "inventory")).toBe(true);
    expect(names.every((n) => n === "show_my_access" || n.startsWith("inventory_"))).toBe(true);
  });

  it("every Inventory write needs confirmation metadata and every read is low risk", () => {
    for (const tool of aiToolRegistry.all().filter((t) => t.module === "inventory")) {
      if (tool.kind === "read") expect(tool.risk).toBe("low");
      else expect(tool.prepare ?? tool.summarize).toBeTruthy();
    }
    const risk = (name: string) => aiToolRegistry.get(name)?.risk;
    expect(risk("inventory_delete_product")).toBe("destructive");
    expect(risk("inventory_adjust_stock")).toBe("financial");
  });
});

describe("capability ceiling", () => {
  it("viewers can only ever view; operators cannot approve what they cannot approve elsewhere", () => {
    const viewer = permissionsForRole("viewer");
    for (const m of AI_MODULES) for (const op of AI_OPERATIONS) expect(roleAllows(viewer, m, op)).toBe(op === "view");
    const operator = permissionsForRole("operator");
    expect(roleAllows(operator, "purchasing", "approve")).toBe(false);
    expect(roleAllows(operator, "inventory", "approve")).toBe(false);
    expect(roleAllows(operator, "manufacturing", "approve")).toBe(true);
    expect(roleAllows(permissionsForRole("admin"), "purchasing", "approve")).toBe(true);
  });

  it("ai.access.manage and ai.usage.view belong to owners and admins only", () => {
    for (const role of ["operator", "viewer"] as const) {
      expect(permissionsForRole(role).has(PERMISSIONS.AI_ACCESS_MANAGE)).toBe(false);
      expect(permissionsForRole(role).has(PERMISSIONS.AI_USAGE_VIEW)).toBe(false);
    }
    for (const role of ["owner", "admin"] as const) {
      expect(permissionsForRole(role).has(PERMISSIONS.AI_ACCESS_MANAGE)).toBe(true);
    }
  });

  it("every preset, clamped to any role, produces no violations", () => {
    for (const role of ["owner", "admin", "operator", "viewer"] as const) {
      const permissions = permissionsForRole(role);
      for (const preset of Object.values(AI_PRESETS)) {
        expect(violations(clampToCeiling(preset.modules, permissions), permissions)).toEqual([]);
      }
      expect(violations(ceilingFor(permissions), permissions)).toEqual([]);
    }
  });
});
