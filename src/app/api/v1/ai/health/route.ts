import { NextResponse } from "next/server";
import { getAiHealth } from "@/server/ai/health";
import { PERMISSIONS, assertPermission } from "@/server/security/permissions";
import { resolveWorkspace } from "@/server/tenancy/workspace";
import { isAppError } from "@/shared/lib/errors";

export const dynamic = "force-dynamic";

/** Operational health of the AI Command Center for owners and administrators. Yes/no facts only. */
export async function GET() {
  try {
    const ctx = await resolveWorkspace();
    assertPermission(ctx.permissions, PERMISSIONS.AI_ACCESS_MANAGE);
    return NextResponse.json({ data: await getAiHealth(ctx.db) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.message }, { status: err.status, headers: { "Cache-Control": "no-store" } });
    return NextResponse.json({ error: "Health check failed" }, { status: 500 });
  }
}
