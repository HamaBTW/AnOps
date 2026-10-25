import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { generateMarketingCopy, listAIGenerations } from "@/server/services/ai-copy.service";
export async function GET() { const session = await auth(); if (!session?.user?.email) return NextResponse.json({ error: "Authentication required." }, { status: 401 }); return NextResponse.json(await listAIGenerations(session.user.email)); }
export async function POST(request: Request) { const session = await auth(); if (!session?.user?.email) return NextResponse.json({ error: "Authentication required." }, { status: 401 }); try { const result = await generateMarketingCopy(session.user.email, session.user.email, await request.json()); return NextResponse.json(result, { status: result.status === "completed" ? 200 : 503 }); } catch { return NextResponse.json({ error: "Invalid copy generation request." }, { status: 400 }); } }
