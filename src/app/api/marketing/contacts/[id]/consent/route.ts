import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { marketingScopeForUser, recordConsent } from "@/server/services/marketing.service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) { const session = await auth(); if (!session?.user?.email) return NextResponse.json({ error: "Authentication required." }, { status: 401 }); try { return NextResponse.json(await recordConsent(await marketingScopeForUser(session.user.email), (await context.params).id, await request.json()), { status: 201 }); } catch (error) { if (error instanceof Error && error.message === "NOT_FOUND") return NextResponse.json({ error: "Contact not found." }, { status: 404 }); return NextResponse.json({ error: "Invalid consent record." }, { status: 400 }); } }
