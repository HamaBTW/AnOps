import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { createContact, listContacts, marketingScopeForUser } from "@/server/services/marketing.service";
import { contactInputSchema } from "@/features/marketing/schemas/marketing.schema";

export async function GET(request: Request) {
  const session = await auth(); if (!session?.user?.email) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const url = new URL(request.url); const raw = Object.fromEntries(url.searchParams.entries());
  try { return NextResponse.json(await listContacts(await marketingScopeForUser(session.user.email), raw)); } catch { return NextResponse.json({ error: "Unable to load contacts." }, { status: 400 }); }
}

export async function POST(request: Request) {
  const session = await auth(); if (!session?.user?.email) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  try {
    const body: unknown = await request.json(); const input = contactInputSchema.parse(body);
    const contact = await createContact(await marketingScopeForUser(session.user.email), input);
    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "CONTACT_DUPLICATE") return NextResponse.json({ error: "A contact with this email or phone already exists." }, { status: 409 });
    return NextResponse.json({ error: "Invalid contact data." }, { status: 400 });
  }
}
