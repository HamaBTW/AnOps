import { NextResponse } from "next/server";
import { resolveWorkspace } from "@/server/tenancy/workspace";
import { assertPermission, PERMISSIONS } from "@/server/security/permissions";
import { startFacebookOAuth } from "@/server/services/facebook-oauth.service";

export async function GET() {
  try {
    const ctx = await resolveWorkspace();
    assertPermission(ctx.permissions, PERMISSIONS.MARKETING_SOCIAL_MANAGE);
    return NextResponse.redirect(await startFacebookOAuth(ctx));
  } catch (error) {
    return NextResponse.json(
      { error: "Meta Facebook Pages integration is not configured or this account is not authorized." },
      { status: 503 }
    );
  }
}
