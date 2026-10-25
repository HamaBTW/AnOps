import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { createCompany, ensureLegacyCompany, listMyCompanies } from "@/server/authz/company";

export async function GET() { const session = await auth(); if (!session?.user?.id || !session.user.email) return NextResponse.json({ error: "Authentication required." }, { status: 401 }); await ensureLegacyCompany(session.user.id, session.user.email); return NextResponse.json(await listMyCompanies(session.user.id)); }
export async function POST(request: Request) { const session = await auth(); if (!session?.user?.id || !session.user.email) return NextResponse.json({ error: "Authentication required." }, { status: 401 }); const body: unknown = await request.json(); const name = body && typeof body === "object" && "name" in body && typeof body.name === "string" ? body.name : ""; try { return NextResponse.json(await createCompany(session.user.id, session.user.email, name), { status: 201 }); } catch { return NextResponse.json({ error: "Unable to create company." }, { status: 400 }); } }
