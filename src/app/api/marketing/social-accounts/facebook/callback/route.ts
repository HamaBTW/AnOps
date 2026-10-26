import { NextResponse } from "next/server";
import { resolveWorkspace } from "@/server/tenancy/workspace";
import { assertPermission, PERMISSIONS } from "@/server/security/permissions";
import {
  connectFacebookPage,
  consumeFacebookOAuthState,
  createFacebookPageSelection,
  discoverFacebookPages,
  exchangeFacebookCode,
} from "@/server/services/facebook-oauth.service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  if (!state || !code) {
    return NextResponse.json({ error: "Facebook authorization was not completed." }, { status: 400 });
  }

  try {
    const ctx = await resolveWorkspace();
    assertPermission(ctx.permissions, PERMISSIONS.MARKETING_SOCIAL_MANAGE);

    const stateRecord = await consumeFacebookOAuthState(ctx, state);
    const userToken = await exchangeFacebookCode(code);
    const pages = await discoverFacebookPages(userToken);

    if (pages.length === 0) {
      return NextResponse.json({ error: "No eligible Facebook Pages were found for this account." }, { status: 409 });
    }
    if (pages.length > 1) {
      return NextResponse.json(await createFacebookPageSelection(ctx, stateRecord._id, userToken, pages), {
        status: 409,
      });
    }

    const account = await connectFacebookPage(ctx, pages[0]);
    return NextResponse.json({ connected: true, account });
  } catch (error) {
    const message =
      error instanceof Error && error.message === "META_PAGE_PERMISSION_MISSING"
        ? "The selected Page does not have the required publishing permission."
        : "Facebook connection could not be completed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
