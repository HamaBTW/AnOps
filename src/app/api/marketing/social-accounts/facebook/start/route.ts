import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { startFacebookOAuth } from "@/server/services/facebook-oauth.service";
import { requireMarketingPermission } from "@/server/services/marketing.service";
export async function GET() { const session = await auth(); if (!session?.user?.email) return NextResponse.json({ error: "Authentication required." }, { status: 401 }); try { const owner = await requireMarketingPermission(session.user.email, "marketing.social.accounts.manage"); return NextResponse.redirect(await startFacebookOAuth(owner)); } catch { return NextResponse.json({ error: "Meta Facebook Pages integration is not configured or this account is not authorized." }, { status: 503 }); } }
