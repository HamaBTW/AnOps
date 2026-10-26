import { NextResponse } from "next/server";
import { resolveWorkspace } from "@/server/tenancy/workspace";
import { assertPermission, PERMISSIONS } from "@/server/security/permissions";
import { selectFacebookPage } from "@/server/services/facebook-oauth.service";

export async function POST(request: Request) {
  const body: unknown = await request.json();
  const selectionId =
    body && typeof body === "object" && "selectionId" in body && typeof body.selectionId === "string"
      ? body.selectionId
      : "";
  const pageId =
    body && typeof body === "object" && "pageId" in body && typeof body.pageId === "string" ? body.pageId : "";

  if (!selectionId || !pageId) {
    return NextResponse.json({ error: "A Page selection is required." }, { status: 400 });
  }

  try {
    const ctx = await resolveWorkspace();
    assertPermission(ctx.permissions, PERMISSIONS.MARKETING_SOCIAL_MANAGE);

    return NextResponse.json({
      connected: true,
      account: await selectFacebookPage(ctx, selectionId, pageId),
    });
  } catch {
    return NextResponse.json(
      { error: "This Page selection is expired, invalid, or no longer authorized." },
      { status: 409 }
    );
  }
}
