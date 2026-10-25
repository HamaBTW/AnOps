import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { listSocialAccounts } from "@/server/services/social-account.service";
import { requireMarketingPermission } from "@/server/services/marketing.service";
export async function GET() { const session = await auth(); if (!session?.user?.email) return NextResponse.json({ error: "Authentication required." }, { status: 401 }); try { return NextResponse.json(await listSocialAccounts(await requireMarketingPermission(session.user.email, "marketing.social.read"))); } catch { return NextResponse.json({ error: "Unable to load social accounts." }, { status: 403 }); } }
export async function POST() { return NextResponse.json({ error: "OAuth provider configuration is required; accounts cannot be connected through this endpoint." }, { status: 503 }); }
