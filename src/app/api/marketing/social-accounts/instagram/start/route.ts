import { NextResponse } from "next/server";
import { resolveWorkspace } from "@/server/tenancy/workspace";
import { assertPermission, PERMISSIONS } from "@/server/security/permissions";
import { startInstagramOAuth } from "@/server/services/instagram-oauth.service";

export async function GET() {
  try {
    const ctx = await resolveWorkspace();
    assertPermission(ctx.permissions, PERMISSIONS.MARKETING_SOCIAL_MANAGE);
    return NextResponse.redirect(await startInstagramOAuth(ctx));
  } catch {
    return NextResponse.json(
      { error: "Instagram Professional integration is not configured on this server." },
      { status: 503 }
    );
  }
}
