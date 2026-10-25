import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { marketingScopeForUser, setContactActive } from "@/server/services/marketing.service";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth(); if (!session?.user?.email) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  try {
    const body: unknown = await request.json(); if (!body || typeof body !== "object" || !("isActive" in body) || typeof body.isActive !== "boolean") return NextResponse.json({ error: "Only active status can be changed here." }, { status: 400 });
    const { id } = await context.params; const updated = await setContactActive(await marketingScopeForUser(session.user.email), id, body.isActive);
    return updated ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Contact not found." }, { status: 404 });
  } catch { return NextResponse.json({ error: "Unable to update contact." }, { status: 400 }); }
}
