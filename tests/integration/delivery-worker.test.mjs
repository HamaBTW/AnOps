import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_TEST_URI;
const dbName = process.env.MONGODB_TEST_DB ?? "anops_marketing_test";
const canRun = Boolean(uri && /(^|[_-])test([_-]|$)/i.test(dbName));
const describe = canRun ? test : (name, _options, _fn) => test(name, { skip: "Set MONGODB_TEST_URI and a test-named MONGODB_TEST_DB to run integration tests." }, () => {});
let client; let collection; let runId;

before(async () => { if (!canRun) return; client = new MongoClient(uri); await client.connect(); collection = client.db(dbName).collection("delivery_worker_integration"); runId = randomUUID(); await collection.createIndex({ runId: 1, idempotencyKey: 1 }, { unique: true }); });
after(async () => { if (collection) await collection.deleteMany({ runId }); if (client) await client.close(); });

describe("MongoDB delivery worker concurrency", async () => {
  const delivery = { runId, idempotencyKey: `${runId}:one`, status: "pending", attemptCount: 0, leaseExpiresAt: new Date(0) };
  await collection?.insertOne(delivery);
  const claim = () => collection.findOneAndUpdate({ runId, status: "pending" }, { $set: { status: "processing", claimId: randomUUID(), leaseExpiresAt: new Date(Date.now() + 60_000) }, $inc: { attemptCount: 1 } }, { returnDocument: "after" });
  const [first, second] = await Promise.all([claim(), claim()]);
  assert.equal(Boolean(first), true); assert.equal(Boolean(second), false);
});

describe("MongoDB delivery lease recovery and idempotency", async () => {
  const key = `${runId}:recovery`; await collection?.insertOne({ runId, idempotencyKey: key, status: "processing", attemptCount: 1, leaseExpiresAt: new Date(Date.now() - 1000) });
  const recovered = await collection?.findOneAndUpdate({ runId, idempotencyKey: key, status: "processing", leaseExpiresAt: { $lte: new Date() } }, { $set: { status: "processing", leaseExpiresAt: new Date(Date.now() + 60_000) }, $inc: { attemptCount: 1 } }, { returnDocument: "after" });
  assert.equal(recovered?.attemptCount, 2);
  await assert.rejects(() => collection.insertOne({ runId, idempotencyKey: key, status: "pending", attemptCount: 0 }));
});
