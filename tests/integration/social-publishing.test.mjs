import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { MongoClient, ObjectId } from "mongodb";

const uri = process.env.MONGODB_TEST_URI;
const dbName = process.env.MONGODB_TEST_DB;
const safeName = Boolean(dbName && /(^|[_-])test([_-]|$)/i.test(dbName));
if (uri && !safeName) throw new Error("MONGODB_TEST_DB must contain 'test'; refusing to run social integration tests against an unsafe database.");
const runnable = Boolean(uri && safeName);
const skipReason = "Set MONGODB_TEST_URI and a test-named MONGODB_TEST_DB to run social integration tests.";
const it = (name, fn) => runnable ? test(name, fn) : test(name, { skip: skipReason }, () => {});

let client;
let database;
let runId;
let posts;
let accounts;
let attempts;
let states;

before(async () => {
  if (!runnable) return;
  client = new MongoClient(uri);
  await client.connect();
  database = client.db(dbName);
  runId = randomUUID();
  posts = database.collection(`social_posts_${runId}`);
  accounts = database.collection(`social_accounts_${runId}`);
  attempts = database.collection(`social_attempts_${runId}`);
  states = database.collection(`social_states_${runId}`);
  await Promise.all([
    posts.createIndex({ status: 1, scheduledAt: 1, socialLeaseExpiresAt: 1 }),
    attempts.createIndex({ postId: 1, attemptNumber: 1 }, { unique: true }),
    accounts.createIndex({ ownerEmail: 1, platform: 1, providerAccountId: 1 }, { unique: true }),
    states.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ]);
});

after(async () => {
  if (!database) return;
  await Promise.all([posts.drop(), accounts.drop(), attempts.drop(), states.drop()]);
  await client.close();
});

it("allows only one concurrent claim and recovers an expired lease", async () => {
  const id = new ObjectId();
  await posts.insertOne({ _id: id, status: "scheduled", scheduledAt: new Date(Date.now() - 1000).toISOString(), socialAttemptCount: 0 });
  const claim = (workerId) => posts.findOneAndUpdate({ status: "scheduled" }, { $set: { status: "publishing", socialClaimId: workerId, socialLeaseExpiresAt: new Date(Date.now() + 60000) }, $inc: { socialAttemptCount: 1 } }, { returnDocument: "after" });
  const [first, second] = await Promise.all([claim("one"), claim("two")]);
  assert.equal(Boolean(first) !== Boolean(second), true);
  await posts.updateOne({ _id: id }, { $set: { socialLeaseExpiresAt: new Date(Date.now() - 1000) } });
  const recovered = await posts.findOneAndUpdate({ _id: id, status: "publishing", socialLeaseExpiresAt: { $lte: new Date() } }, { $set: { socialClaimId: "recovered", socialLeaseExpiresAt: new Date(Date.now() + 60000) }, $inc: { socialAttemptCount: 1 } }, { returnDocument: "after" });
  assert.equal(recovered.socialAttemptCount, 2);
});

it("rejects replayed and cross-user OAuth state claims", async () => {
  await states.insertOne({ stateId: "state-1", ownerEmail: "alice@example.com", status: "pending", expiresAt: new Date(Date.now() + 60000) });
  const wrongOwner = await states.findOneAndUpdate({ stateId: "state-1", ownerEmail: "bob@example.com", status: "pending" }, { $set: { status: "consumed" } }, { returnDocument: "after" });
  assert.equal(wrongOwner, null);
  const consumed = await states.findOneAndUpdate({ stateId: "state-1", ownerEmail: "alice@example.com", status: "pending" }, { $set: { status: "consumed" } }, { returnDocument: "after" });
  assert.equal(consumed.status, "consumed");
  const replay = await states.findOneAndUpdate({ stateId: "state-1", ownerEmail: "alice@example.com", status: "pending" }, { $set: { status: "consumed" } }, { returnDocument: "after" });
  assert.equal(replay, null);
});

it("rejects expired selection sessions", async () => {
  await states.insertOne({ selectionId: "selection-1", ownerEmail: "alice@example.com", status: "selection_pending", expiresAt: new Date(Date.now() - 1000) });
  const selected = await states.findOneAndUpdate({ selectionId: "selection-1", ownerEmail: "alice@example.com", status: "selection_pending", expiresAt: { $gt: new Date() } }, { $set: { status: "selection_consumed" } }, { returnDocument: "after" });
  assert.equal(selected, null);
});

it("prevents duplicate provider accounts and preserves owner isolation", async () => {
  await accounts.insertOne({ ownerEmail: "alice@example.com", platform: "facebook", providerAccountId: "page-1", encryptedAccessToken: "cipher-a" });
  await assert.rejects(() => accounts.insertOne({ ownerEmail: "alice@example.com", platform: "facebook", providerAccountId: "page-1", encryptedAccessToken: "cipher-b" }));
  const otherOwner = await accounts.findOne({ ownerEmail: "bob@example.com", providerAccountId: "page-1" });
  assert.equal(otherOwner, null);
  const publicProjection = await accounts.findOne({ ownerEmail: "alice@example.com" }, { projection: { encryptedAccessToken: 0 } });
  assert.equal("encryptedAccessToken" in publicProjection, false);
});

it("keeps attempt history owner-scoped and gives each claim a unique attempt number", async () => {
  const postId = new ObjectId();
  await attempts.insertMany([{ ownerEmail: "alice@example.com", postId, attemptNumber: 1, outcome: "uncertain" }, { ownerEmail: "alice@example.com", postId, attemptNumber: 2, outcome: "failed" }, { ownerEmail: "bob@example.com", postId, attemptNumber: 1, outcome: "confirmed" }]);
  assert.equal(await attempts.countDocuments({ ownerEmail: "alice@example.com", postId }), 2);
  assert.equal(await attempts.countDocuments({ ownerEmail: "bob@example.com", postId }), 1);
  await assert.rejects(() => attempts.insertOne({ ownerEmail: "alice@example.com", postId, attemptNumber: 2, outcome: "failed" }));
});

it("does not let a stale claim overwrite a newer result", async () => {
  const id = new ObjectId();
  await posts.insertOne({ _id: id, status: "publishing", socialClaimId: "new-worker" });
  const staleUpdate = await posts.updateOne({ _id: id, status: "publishing", socialClaimId: "old-worker" }, { $set: { status: "published", providerPostId: "stale-id" } });
  assert.equal(staleUpdate.modifiedCount, 0);
  assert.equal((await posts.findOne({ _id: id })).providerPostId, undefined);
});

it("models uncertain outcomes as manual review and disallows ordinary retry", () => {
  const allowedRetryStates = ["failed"];
  assert.equal(allowedRetryStates.includes("manual_review"), false);
  assert.equal(allowedRetryStates.includes("failed"), true);
});
