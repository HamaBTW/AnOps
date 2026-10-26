#!/usr/bin/env node
/**
 * Marketing Campaign Delivery Worker
 *
 * Scans and claims due or retryable deliveries, re-checks consent just-in-time,
 * suppresses invalidated deliveries without sending, and updates delivery states.
 * Uses atomic leases to coordinate across concurrent workers safely.
 */

import { MongoClient, ObjectId } from "mongodb";
import { claimPendingDeliveries, recordDeliveryAttempt } from "../src/server/marketing/delivery.service.js";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const client = new MongoClient(uri);

async function run() {
  console.log("[DeliveryWorker] Starting campaign delivery worker...");
  await client.connect();
  const db = client.db();

  const workerId = `worker-${process.pid}-${Date.now()}`;
  console.log(`[DeliveryWorker] Worker ${workerId} connected to DB`);

  // Bounded iteration to process pending batches
  let processedCount = 0;
  try {
    const claims = await claimPendingDeliveries(db, {
      workerId,
      leaseDurationMs: 60_000,
      limit: 25,
    });

    console.log(`[DeliveryWorker] Claimed ${claims.length} deliveries for execution.`);

    for (const claim of claims) {
      processedCount++;
      // Check suppression / consent
      const contact = await db.collection("contacts").findOne({ _id: claim.contactId });
      if (!contact || !contact.isActive) {
        await recordDeliveryAttempt(db, {
          deliveryId: claim._id,
          workerId,
          outcome: "suppressed",
          safeError: "Contact is inactive or archived",
        });
        continue;
      }

      const activeConsent = await db.collection("marketing_consent_records").findOne({
        companyId: claim.companyId,
        contactId: claim.contactId,
        channel: claim.channel,
        status: "granted",
        withdrawnAt: { $exists: false },
      });

      if (!activeConsent) {
        await recordDeliveryAttempt(db, {
          deliveryId: claim._id,
          workerId,
          outcome: "suppressed",
          safeError: `Missing or withdrawn consent for ${claim.channel}`,
        });
        continue;
      }

      // If no external provider configured, truthful unconfigured record
      await recordDeliveryAttempt(db, {
        deliveryId: claim._id,
        workerId,
        outcome: "failed",
        safeError: "No external email/sms provider configured for delivery",
      });
    }

    console.log(`[DeliveryWorker] Batch completed. Total deliveries handled: ${processedCount}`);
  } catch (err) {
    console.error("[DeliveryWorker] Execution error:", err);
  } finally {
    await client.close();
  }
}

run().catch((err) => {
  console.error("[DeliveryWorker] Fatal:", err);
  process.exit(1);
});
