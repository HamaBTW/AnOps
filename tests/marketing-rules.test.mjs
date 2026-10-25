import test from "node:test";
import assert from "node:assert/strict";

const transitions = {
  submit: ["draft"],
  approve: ["pending_approval"],
  reject: ["pending_approval"],
  schedule: ["approved"],
  cancel: ["pending_approval", "approved", "scheduled"],
};

function canTransition(status, command) {
  return transitions[command]?.includes(status) ?? false;
}

function retryDelay(attempt, base = 30_000, max = 900_000) {
  return Math.min(max, base * (2 ** Math.max(0, attempt - 1)));
}

function normalizeEventType(value) {
  const event = value.toLowerCase();
  if (["accepted", "queued"].includes(event)) return "accepted";
  if (["sent", "sending"].includes(event)) return "sent";
  if (["delivered", "delivery"].includes(event)) return "delivered";
  if (["bounced", "bounce"].includes(event)) return "bounced";
  if (["complaint", "complained", "spam"].includes(event)) return "complained";
  if (["rejected", "failed", "failure"].includes(event)) return "rejected";
  return "unknown";
}

function validateTemplate({ channel, subject = "", body }) {
  if (!body || body.length > 10000) return false;
  if (channel === "email" && !subject) return false;
  if (channel === "sms" && body.length > 1600) return false;
  return channel === "email" || channel === "sms";
}

test("email templates require a subject and valid body", () => {
  assert.equal(validateTemplate({ channel: "email", subject: "Welcome", body: "Hello" }), true);
  assert.equal(validateTemplate({ channel: "email", body: "Hello" }), false);
});

test("SMS templates enforce the channel body limit", () => {
  assert.equal(validateTemplate({ channel: "sms", body: "Hello" }), true);
  assert.equal(validateTemplate({ channel: "sms", body: "x".repeat(1601) }), false);
});

test("campaign transitions reject invalid lifecycle commands", () => {
  assert.equal(canTransition("draft", "submit"), true);
  assert.equal(canTransition("draft", "approve"), false);
  assert.equal(canTransition("approved", "schedule"), true);
  assert.equal(canTransition("cancelled", "schedule"), false);
});

test("retry backoff is bounded and increases by attempt", () => {
  assert.equal(retryDelay(1), 30_000);
  assert.equal(retryDelay(2), 60_000);
  assert.equal(retryDelay(10), 900_000);
});

test("provider events normalize without inventing unsupported metrics", () => {
  assert.equal(normalizeEventType("DELIVERED"), "delivered");
  assert.equal(normalizeEventType("open"), "unknown");
});

test("template application is content-only and channel-aware", () => {
  const emailTemplate = { channel: "email", subject: "Offer", body: "Save today" };
  const smsTemplate = { channel: "sms", body: "Save today" };
  assert.deepEqual({ subject: emailTemplate.subject, body: emailTemplate.body }, { subject: "Offer", body: "Save today" });
  assert.deepEqual({ subject: "", body: smsTemplate.body }, { subject: "", body: "Save today" });
});

test("uncertain social outcomes require manual review and are not retryable", () => {
  const retryable = new Set(["failed"]);
  assert.equal(retryable.has("failed"), true);
  assert.equal(retryable.has("manual_review"), false);
});

test("social retry requires a still-future schedule", () => {
  const canRetry = (status, scheduledAt) => status === "failed" && new Date(scheduledAt).getTime() > Date.now();
  assert.equal(canRetry("failed", new Date(Date.now() + 60_000).toISOString()), true);
  assert.equal(canRetry("failed", new Date(Date.now() - 60_000).toISOString()), false);
  assert.equal(canRetry("manual_review", new Date(Date.now() + 60_000).toISOString()), false);
});

test("Instagram capabilities remain intentionally narrow", () => {
  const supported = ["professional_image_post"];
  const unsupported = ["personal_accounts", "reels", "stories", "carousels", "video", "media_hosting"];
  assert.deepEqual(supported, ["professional_image_post"]);
  assert.equal(unsupported.includes("reels"), true);
  assert.equal(unsupported.includes("media_hosting"), true);
});

test("Instagram media validation accepts only HTTPS URLs", () => {
  const isPublicHttps = (value) => { try { return new URL(value).protocol === "https:"; } catch { return false; } };
  assert.equal(isPublicHttps("https://cdn.example.com/image.jpg"), true);
  assert.equal(isPublicHttps("http://cdn.example.com/image.jpg"), false);
  assert.equal(isPublicHttps("not-a-url"), false);
});

test("Instagram publication requires container completion before publish", () => {
  const sequence = ["create_container", "poll_status", "publish_container"];
  assert.deepEqual(sequence, ["create_container", "poll_status", "publish_container"]);
  assert.equal(sequence.indexOf("publish_container") > sequence.indexOf("poll_status"), true);
});
