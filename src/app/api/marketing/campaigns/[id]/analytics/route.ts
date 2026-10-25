import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { getCampaignAnalytics } from "@/server/marketing/delivery.service";
import { marketingScopeForUser } from "@/server/services/marketing.service";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) { const session = await auth(); if (!session?.user?.email) return NextResponse.json({ error: "Authentication required." }, { status: 401 }); try { return NextResponse.json(await getCampaignAnalytics(await marketingScopeForUser(session.user.email), (await context.params).id)); } catch { return NextResponse.json({ error: "Unable to load analytics." }, { status: 404 }); } }
