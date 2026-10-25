import { randomUUID } from "node:crypto";
import { claimSocialPost, processClaimedSocialPost } from "../src/server/services/social.service";
if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required for the social worker.");
let stopping = false; process.on("SIGINT", () => { stopping = true; }); process.on("SIGTERM", () => { stopping = true; });
async function main() { const workerId = `social-worker:${randomUUID()}`; const poll = Number(process.env.MARKETING_SOCIAL_WORKER_POLL_MS ?? 5000); while (!stopping) { const post = await claimSocialPost(workerId); if (post) await processClaimedSocialPost(post as typeof post & { _id: import("mongodb").ObjectId; socialClaimId?: string }); else await new Promise((resolve) => setTimeout(resolve, poll)); } }
main().catch((error: unknown) => { console.error("Social worker stopped.", error instanceof Error ? error.message : "unknown error"); process.exitCode = 1; });
