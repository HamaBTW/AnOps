import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import { computeReplenishmentLines } from "@/server/purchasing/replenishment.service";
import { parseRationales } from "@/server/purchasing/replenishment-rationale";
import { replenishmentConvertSchema, replenishmentGenerateSchema } from "@/features/purchasing/schemas/purchasing.schema";
import { QTY_SCALE } from "@/shared/lib/fixed-point";

const MICRO = QTY_SCALE;

function product(sku: string, unitOfMeasure: "unit" | "kg", reorderPoint: number) {
  return {
    _id: new ObjectId(),
    sku,
    name: `Item ${sku}`,
    unitOfMeasure,
    reorderPointMicro: reorderPoint * MICRO,
  } as const;
}

describe("computeReplenishmentLines", () => {
  it("projects average daily use over the horizon and adds the reorder point", () => {
    const item = product("A", "unit", 5);
    // 30 units consumed in the 30-day lookback: 1 per day. Horizon 14 days: need 14 + reorder 5 = 19.
    // On hand 10, so the shortfall is 9.
    const lines = computeReplenishmentLines({
      products: [item],
      onHandByProduct: new Map([[item._id.toHexString(), 10 * MICRO]]),
      consumedByProduct: new Map([[item._id.toHexString(), 30 * MICRO]]),
      lookbackDays: 30,
      horizonDays: 14,
    });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      forecastDailyUsageMicro: MICRO,
      onHandMicro: 10 * MICRO,
      consumedMicro: 30 * MICRO,
      suggestedMicro: 9 * MICRO,
      rationale: null,
    });
  });

  it("omits products that already cover the target", () => {
    const item = product("B", "unit", 2);
    const lines = computeReplenishmentLines({
      products: [item],
      onHandByProduct: new Map([[item._id.toHexString(), 50 * MICRO]]),
      consumedByProduct: new Map(),
      lookbackDays: 30,
      horizonDays: 7,
    });
    expect(lines).toEqual([]);
  });

  it("rounds a countable shortfall up to whole units", () => {
    const item = product("C", "unit", 0);
    // 10 consumed over 30 days is 0.333 per day. Over 7 days that is 2.333, so the shortfall rounds up to 3.
    const lines = computeReplenishmentLines({
      products: [item],
      onHandByProduct: new Map(),
      consumedByProduct: new Map([[item._id.toHexString(), 10 * MICRO]]),
      lookbackDays: 30,
      horizonDays: 7,
    });
    expect(lines[0].suggestedMicro).toBe(3 * MICRO);
  });

  it("keeps fractional quantities for weight units", () => {
    const item = product("D", "kg", 1);
    const lines = computeReplenishmentLines({
      products: [item],
      onHandByProduct: new Map([[item._id.toHexString(), Math.round(0.25 * MICRO)]]),
      consumedByProduct: new Map(),
      lookbackDays: 30,
      horizonDays: 7,
    });
    expect(lines[0].suggestedMicro).toBe(MICRO - Math.round(0.25 * MICRO));
  });
});

describe("parseRationales", () => {
  const known = new Set(["aaaaaaaaaaaaaaaaaaaaaaaa"]);

  it("keeps only products that were sent and drops unknown ids", () => {
    const text = JSON.stringify({
      items: [
        { productId: "aaaaaaaaaaaaaaaaaaaaaaaa", rationale: "Stock is below the reorder point." },
        { productId: "ffffffffffffffffffffffff", rationale: "Invented product." },
      ],
    });
    const parsed = parseRationales(text, known);
    expect([...parsed.keys()]).toEqual(["aaaaaaaaaaaaaaaaaaaaaaaa"]);
  });

  it("rejects malformed JSON, wrong shapes and oversized text", () => {
    expect(parseRationales("not json", known).size).toBe(0);
    expect(parseRationales('{"items":"nope"}', known).size).toBe(0);
    const tooLong = JSON.stringify({ items: [{ productId: "aaaaaaaaaaaaaaaaaaaaaaaa", rationale: "x".repeat(400) }] });
    expect(parseRationales(tooLong, known).size).toBe(0);
  });

  it("uses the first rationale when a product id repeats", () => {
    const text = JSON.stringify({
      items: [
        { productId: "aaaaaaaaaaaaaaaaaaaaaaaa", rationale: "first" },
        { productId: "aaaaaaaaaaaaaaaaaaaaaaaa", rationale: "second" },
      ],
    });
    expect(parseRationales(text, known).get("aaaaaaaaaaaaaaaaaaaaaaaa")).toBe("first");
  });
});

describe("replenishment input schemas", () => {
  it("bounds the forecast horizon", () => {
    const warehouseId = "aaaaaaaaaaaaaaaaaaaaaaaa";
    expect(replenishmentGenerateSchema.safeParse({ warehouseId, horizonDays: 14 }).success).toBe(true);
    expect(replenishmentGenerateSchema.safeParse({ warehouseId, horizonDays: "14" }).success).toBe(true);
    expect(replenishmentGenerateSchema.safeParse({ warehouseId, horizonDays: 0 }).success).toBe(false);
    expect(replenishmentGenerateSchema.safeParse({ warehouseId, horizonDays: 91 }).success).toBe(false);
    expect(replenishmentGenerateSchema.safeParse({ warehouseId, horizonDays: 7.5 }).success).toBe(false);
    expect(replenishmentGenerateSchema.safeParse({ warehouseId, horizonDays: 7, companyId: "x" }).success).toBe(false);
  });

  it("rejects extra fields on conversion so the client cannot set prices or status", () => {
    const base = { supplierId: "aaaaaaaaaaaaaaaaaaaaaaaa", expectedVersion: 1 };
    expect(replenishmentConvertSchema.safeParse(base).success).toBe(true);
    expect(replenishmentConvertSchema.safeParse({ ...base, unitCost: "0.001" }).success).toBe(false);
    expect(replenishmentConvertSchema.safeParse({ ...base, status: "approved" }).success).toBe(false);
  });
});

describe("insufficient history", () => {
  it("suggests only the reorder point when a product has no recorded consumption", () => {
    const item = product("E", "unit", 6);
    const lines = computeReplenishmentLines({
      products: [item],
      onHandByProduct: new Map([[item._id.toHexString(), 2 * MICRO]]),
      consumedByProduct: new Map(),
      lookbackDays: 30,
      horizonDays: 14,
    });
    // No history means zero daily use, so the only need is 6 (reorder point) minus 2 on hand.
    expect(lines[0]).toMatchObject({ forecastDailyUsageMicro: 0, consumedMicro: 0, suggestedMicro: 4 * MICRO });
  });
});
