import { randomUUID } from "node:crypto";
import { runWorkerOnce, WORKER_DEFAULTS } from "../src/server/marketing/delivery.service";

if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required for the marketing worker.");
const workerId = `marketing-worker:${randomUUID()}`;
let stopping = false;
const stop = () => { stopping = true; };
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

async function main() {
  const intervalMs = Number(process.env.MARKETING_WORKER_POLL_MS ?? 5000);
  while (!stopping) {
    const processed = await runWorkerOnce(workerId, { ...WORKER_DEFAULTS, batchSize: Number(process.env.MARKETING_WORKER_BATCH_SIZE ?? WORKER_DEFAULTS.batchSize) });
    if (processed === 0) await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

main().catch((error: unknown) => { console.error("Marketing worker stopped with an error.", error instanceof Error ? error.message : "unknown error"); process.exitCode = 1; });
