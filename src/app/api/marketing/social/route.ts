import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { createSocialPost, listSocialPosts } from "@/server/services/social.service";
import { requireMarketingPermission } from "@/server/services/marketing.service";
export async function GET(request: Request) { const session = await auth(); if (!session?.user?.email) return NextResponse.json({ error: "Authentication required." }, { status: 401 }); try { return NextResponse.json(await listSocialPosts(await requireMarketingPermission(session.user.email, "marketing.social.read"), new URL(request.url).searchParams.get("status") ?? undefined)); } catch { return NextResponse.json({ error: "Unable to load social posts." }, { status: 403 }); } }
export async function POST(request: Request) { const session = await auth(); if (!session?.user?.email) return NextResponse.json({ error: "Authentication required." }, { status: 401 }); try { return NextResponse.json(await createSocialPost(await requireMarketingPermission(session.user.email, "marketing.social.manage"), await request.json()), { status: 201 }); } catch { return NextResponse.json({ error: "Invalid social post data." }, { status: 400 }); } }
