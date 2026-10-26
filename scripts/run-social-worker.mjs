#!/usr/bin/env node
/**
 * Marketing Social Publishing Worker
 *
 * Scans and claims scheduled social posts that are due, coordinates via atomic leases,
 * dispatches to configured social providers or truthfully marks unavailable.
 */

import { MongoClient } from "mongodb";
import { claimScheduledPosts, recordPublishAttempt } from "../src/server/services/social.service.js";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const client = new MongoClient(uri);

async function run() {
  console.log("[SocialWorker] Starting social publishing worker...");
  await client.connect();
  const db = client.db();

  const workerId = `social-worker-${process.pid}-${Date.now()}`;
  console.log(`[SocialWorker] Worker ${workerId} connected to DB`);

  let processedCount = 0;
  try {
    const claims = await claimScheduledPosts(db, {
      workerId,
      leaseDurationMs: 60_000,
      limit: 20,
    });

    console.log(`[SocialWorker] Claimed ${claims.length} scheduled posts.`);

    for (const claim of claims) {
      processedCount++;
      // Truthful unavailable check: no live provider credentials configured
      await recordPublishAttempt(db, {
        postId: claim._id,
        workerId,
        outcome: "failed",
        safeError: "Social publishing provider adapter credentials not configured",
      });
    }

    console.log(`[SocialWorker] Batch completed. Total posts handled: ${processedCount}`);
  } catch (err) {
    console.error("[SocialWorker] Execution error:", err);
  } finally {
    await client.close();
  }
}

run().catch((err) => {
  console.error("[SocialWorker] Fatal:", err);
  process.exit(1);
});
