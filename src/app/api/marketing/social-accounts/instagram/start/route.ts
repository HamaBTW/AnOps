import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { startInstagramOAuth } from "@/server/services/instagram-oauth.service";
import { requireMarketingPermission } from "@/server/services/marketing.service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  try { return NextResponse.redirect(await startInstagramOAuth(await requireMarketingPermission(session.user.email, "marketing.social.accounts.manage"))); }
  catch { return NextResponse.json({ error: "Instagram Professional integration is not configured on this server." }, { status: 503 }); }
}
