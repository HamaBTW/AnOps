import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { connectInstagramAccount, consumeInstagramOAuthState, discoverInstagramProfessionalAccount, exchangeInstagramCode } from "@/server/services/instagram-oauth.service";
import { requireMarketingPermission } from "@/server/services/marketing.service";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const url = new URL(request.url); const state = url.searchParams.get("state"); const code = url.searchParams.get("code");
  if (url.searchParams.get("error") || !state || !code) return NextResponse.json({ error: "Instagram authorization was not completed." }, { status: 400 });
  try { const owner = await requireMarketingPermission(session.user.email, "marketing.social.accounts.manage"); await consumeInstagramOAuthState(owner, state); const exchanged = await exchangeInstagramCode(code); const account = await discoverInstagramProfessionalAccount(exchanged.token); return NextResponse.json({ connected: true, account: await connectInstagramAccount(owner, { ...account, token: exchanged.token, expiresIn: exchanged.expiresIn }) }); }
  catch (error) { const message = error instanceof Error && error.message === "INSTAGRAM_ACCOUNT_NOT_ELIGIBLE" ? "Only Instagram Business or Creator accounts can be connected." : "Instagram connection could not be completed."; return NextResponse.json({ error: message }, { status: 400 }); }
}
