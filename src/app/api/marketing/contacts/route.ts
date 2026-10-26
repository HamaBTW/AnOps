import { NextResponse } from "next/server";
import { resolveWorkspace } from "@/server/tenancy/workspace";
import { listContacts, createContact } from "@/server/services/marketing.service";
import { isAppError } from "@/shared/lib/errors";

export async function GET(request: Request) {
  try {
    const ctx = await resolveWorkspace();
    const url = new URL(request.url);
    const raw = Object.fromEntries(url.searchParams.entries());
    const result = await listContacts(ctx, raw);
    return NextResponse.json(result);
  } catch (error) {
    if (isAppError(error)) {
      const status = error.code === "UNAUTHENTICATED" ? 401 : error.code === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "Unable to load contacts." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await resolveWorkspace();
    const body: unknown = await request.json();
    const contact = await createContact(ctx, body);
    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    if (isAppError(error)) {
      const status =
        error.code === "UNAUTHENTICATED"
          ? 401
          : error.code === "FORBIDDEN"
          ? 403
          : error.code === "CONFLICT"
          ? 409
          : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "Invalid contact data." }, { status: 400 });
  }
}
