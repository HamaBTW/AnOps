import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { selectFacebookPage } from "@/server/services/facebook-oauth.service";
import { requireMarketingPermission } from "@/server/services/marketing.service";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body: unknown = await request.json();
  const selectionId = body && typeof body === "object" && "selectionId" in body && typeof body.selectionId === "string" ? body.selectionId : "";
  const pageId = body && typeof body === "object" && "pageId" in body && typeof body.pageId === "string" ? body.pageId : "";
  if (!selectionId || !pageId) return NextResponse.json({ error: "A Page selection is required." }, { status: 400 });
  try { return NextResponse.json({ connected: true, account: await selectFacebookPage(await requireMarketingPermission(session.user.email, "marketing.social.accounts.manage"), selectionId, pageId) }); }
  catch { return NextResponse.json({ error: "This Page selection is expired, invalid, or no longer authorized." }, { status: 409 }); }
}
