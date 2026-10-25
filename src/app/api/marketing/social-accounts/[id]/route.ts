import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { disconnectSocialAccount } from "@/server/services/social-account.service";
import { requireMarketingPermission } from "@/server/services/marketing.service";
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) { const session = await auth(); if (!session?.user?.email) return NextResponse.json({ error: "Authentication required." }, { status: 401 }); try { await disconnectSocialAccount(await requireMarketingPermission(session.user.email, "marketing.social.accounts.manage"), (await context.params).id); return new NextResponse(null, { status: 204 }); } catch { return NextResponse.json({ error: "Account not found." }, { status: 404 }); } }
