import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { createAudience, listAudiences, marketingScopeForUser } from "@/server/services/marketing.service";

export async function GET() { const session = await auth(); if (!session?.user?.email) return NextResponse.json({ error: "Authentication required." }, { status: 401 }); try { return NextResponse.json(await listAudiences(await marketingScopeForUser(session.user.email))); } catch { return NextResponse.json({ error: "Unable to load audiences." }, { status: 500 }); } }
export async function POST(request: Request) { const session = await auth(); if (!session?.user?.email) return NextResponse.json({ error: "Authentication required." }, { status: 401 }); try { return NextResponse.json(await createAudience(await marketingScopeForUser(session.user.email), await request.json()), { status: 201 }); } catch { return NextResponse.json({ error: "Invalid audience data." }, { status: 400 }); } }
