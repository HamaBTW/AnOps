import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * There must be no way to reach a model that skips the AI gate. Only these files may call the provider router: the router itself,
 * the gate, the structured-completion helper (called by the orchestrator and the draft engine, which apply the same controls),
 * and those two callers' default completion.
 */
const ALLOWED = new Set([
  "src/server/ai/index.ts",
  "src/server/ai/gate.ts",
  "src/server/ai/structured-completion.ts",
  "src/server/ai/orchestrator.ts",
  "src/server/ai/draft/draft-engine.ts",
]);

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === "node_modules" || name === "graphify-out") return [];
    return statSync(path).isDirectory() ? files(path) : /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

describe("AI gate coverage", () => {
  it("no file outside the allowed few calls ai.complete or ai.ask", () => {
    const offenders = files("src").filter((f) => !ALLOWED.has(f) && /\bai\.(complete|ask)\(/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("agents cannot run without a supplied (gated) completion function, and clients cannot choose the provider or model", () => {
    const base = readFileSync("src/server/ai/base-agent.ts", "utf8");
    expect(base).not.toMatch(/from "@\/server\/ai"/);
    expect(base).not.toMatch(/providerOverride|modelOverride/);
    const action = readFileSync("src/features/hr/actions/hr-assistant.action.ts", "utf8");
    expect(action).not.toMatch(/provider:\s*z|model:\s*z/);
    expect(action).toMatch(/gatedComplete/);
  });

  it("the legacy features reach the model only through gatedComplete", () => {
    for (const f of [
      "src/features/hr/actions/hr-assistant.action.ts",
      "src/features/community/actions/community.action.ts",
      "src/features/finance/actions/receipt-ocr.actions.ts",
      "src/server/purchasing/replenishment-rationale.ts",
      "src/server/marketing/ai/copy.service.ts",
    ]) {
      expect(readFileSync(f, "utf8"), f).toMatch(/gatedComplete/);
    }
  });
});
