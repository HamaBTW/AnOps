import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AI_MODULES, AI_OPERATIONS, ceilingFor, clampToCeiling, roleAllows, violations } from "@/server/ai/access/capabilities";
import { defineTool } from "@/server/ai/tools/define-tool";
import { CORE_TOOLS } from "@/server/ai/tools/core.tools";
import { createToolRegistry } from "@/server/ai/tools/registry";
import { aiToolRegistry } from "@/server/ai/tools";
import { commandRegistry } from "@/server/ai/commands";
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

  it("the production registry passes its own checks and exposes only Core, Inventory, Purchasing, Manufacturing and Finance tools", () => {
    const names = aiToolRegistry.all().map((t) => t.name);
    expect(names.slice(0, CORE_TOOLS.length)).toEqual(CORE_TOOLS.map((t) => t.name));
    expect(aiToolRegistry.all().every((t) => ["core", "inventory", "purchasing", "manufacturing", "finance"].includes(t.module))).toBe(true);
    expect(names.every((n) => n === "show_my_access" || /^(inventory|purchasing|manufacturing|finance)_/.test(n))).toBe(true);
    // Marketing, HR, CRM and the rest have no AI tools yet: nothing may claim them.
    expect(names.some((n) => /marketing|hr_|crm|sales|community|company/.test(n))).toBe(false);
  });

  it("every Purchasing and Manufacturing write names its record in the confirmation, and money or stock movers are typed or sensitive", () => {
    const risk = (n: string) => aiToolRegistry.get(n)?.risk;
    expect(risk("purchasing_approve_order")).toBe("financial");
    expect(risk("purchasing_cancel_order")).toBe("destructive");
    expect(risk("manufacturing_complete_work_order")).toBe("financial");
    expect(risk("manufacturing_cancel_work_order")).toBe("destructive");
    expect(risk("purchasing_post_receipt")).toBe("sensitive");
    for (const tool of aiToolRegistry.all().filter((t) => (t.module === "purchasing" || t.module === "manufacturing") && t.kind === "write")) {
      expect(tool.prepare, tool.name).toBeTypeOf("function"); // every write previews its real effect from current records
    }
  });

  it("Finance: every write previews its real effect, money-changing writes are financial with a typed phrase, and nothing can pay out or delete", () => {
    const writes = aiToolRegistry.all().filter((t) => t.module === "finance" && t.kind === "write");
    for (const tool of writes) expect(tool.prepare, tool.name).toBeTypeOf("function");
    const risk = (n: string) => aiToolRegistry.get(n)?.risk;
    for (const n of ["finance_post_invoice", "finance_record_payment", "finance_allocate_payment", "finance_approve_expense"]) expect(risk(n), n).toBe("financial");
    for (const n of ["finance_void_invoice", "finance_reject_expense"]) expect(risk(n), n).toBe("destructive");
    expect(aiToolRegistry.all().filter((t) => t.module === "finance" && t.kind === "read").every((t) => t.risk === "low")).toBe(true);
    expect(writes.map((t) => t.name).filter((n) => /pay_expense|mark_paid|delete|transfer|refund|ocr|scan/.test(n))).toEqual([]);
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

describe("AI-assisted entry declarations", () => {
  it("every draft-capable command ends in a registered write tool of the same module, keeps a manual step, and marks its critical fields", () => {
    const drafts = commandRegistry.all().filter((c) => c.draft);
    expect(drafts.map((c) => c.name).sort()).toEqual([
      "adjust", "allocate", "editbom", "editcategory", "editcustomer", "editorder", "editproduct", "editsupplier", "editwarehouse", "genreplenishment", "issue", "newbom", "newcategory",
      "newcustomer", "newexpense", "newexpensecategory", "newinvoice", "neworder", "newproduct", "newsupplier", "newwarehouse", "newworkorder", "receive", "receivegoods", "recordpayment", "transfer",
    ]);
    for (const def of drafts) {
      const tool = aiToolRegistry.get(def.draft!.tool);
      expect(tool?.kind, def.name).toBe("write");
      expect(tool?.module, def.name).toBe(def.module);
      expect(def.manual, def.name).toBeTypeOf("function");
      expect(def.submit, def.name).toBeTypeOf("function");
      // Anything that moves stock or sets a price must never be taken on the model's word.
      if (def.draft!.tool.includes("stock")) expect(def.draft!.criticalFields).toContain(def.name === "adjust" ? "delta" : "quantity");
    }
    expect(commandRegistry.byDraftTool("inventory_create_product")?.name).toBe("newproduct");
    expect(commandRegistry.byDraftTool("inventory_delete_product")).toBeUndefined();
    // Posting, voiding, approving and rejecting are decisions on existing records, never described in words.
    for (const tool of ["finance_post_invoice", "finance_void_invoice", "finance_approve_expense", "finance_reject_expense", "finance_submit_expense"]) expect(commandRegistry.byDraftTool(tool), tool).toBeUndefined();
    // Money is never taken on the model's word.
    expect(commandRegistry.get("recordpayment")!.draft!.criticalFields).toEqual(expect.arrayContaining(["amount", "method"]));
    expect(commandRegistry.get("newexpense")!.draft!.criticalFields).toEqual(expect.arrayContaining(["amount", "expenseDate"]));
    expect(commandRegistry.get("newinvoice")!.draft!.lines!.criticalColumns).toEqual(expect.arrayContaining(["quantity", "unitPrice", "taxRate"]));
  });

  it("destructive and archive tools have no AI draft form: they keep the picker and typed confirmation", () => {
    for (const name of ["deleteproduct", "archiveproduct", "restoreproduct", "approveorder", "cancelorder", "postreceipt", "cancelreceipt", "convertproposal", "activatebom", "archivebom", "startworkorder", "completeworkorder", "cancelworkorder"]) {
      expect(commandRegistry.get(name)?.draft, name).toBeUndefined();
    }
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
