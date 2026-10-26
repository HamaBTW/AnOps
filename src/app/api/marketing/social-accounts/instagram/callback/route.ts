import { NextResponse } from "next/server";
import { resolveWorkspace } from "@/server/tenancy/workspace";
import { assertPermission, PERMISSIONS } from "@/server/security/permissions";
import {
  connectInstagramAccount,
  consumeInstagramOAuthState,
  discoverInstagramProfessionalAccount,
  exchangeInstagramCode,
} from "@/server/services/instagram-oauth.service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");

  if (url.searchParams.get("error") || !state || !code) {
    return NextResponse.json({ error: "Instagram authorization was not completed." }, { status: 400 });
  }

  try {
    const ctx = await resolveWorkspace();
    assertPermission(ctx.permissions, PERMISSIONS.MARKETING_SOCIAL_MANAGE);

    await consumeInstagramOAuthState(ctx, state);
    const exchanged = await exchangeInstagramCode(code);
    const account = await discoverInstagramProfessionalAccount(exchanged.token);

    return NextResponse.json({
      connected: true,
      account: await connectInstagramAccount(ctx, {
        ...account,
        token: exchanged.token,
        expiresIn: exchanged.expiresIn,
      }),
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message === "INSTAGRAM_ACCOUNT_NOT_ELIGIBLE"
        ? "Only Instagram Business or Creator accounts can be connected."
        : "Instagram connection could not be completed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
