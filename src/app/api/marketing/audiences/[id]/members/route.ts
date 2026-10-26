import { NextResponse } from "next/server";
import { resolveWorkspace } from "@/server/tenancy/workspace";
import { addAudienceMember, removeAudienceMember } from "@/server/services/marketing.service";
import { isAppError } from "@/shared/lib/errors";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await resolveWorkspace();
    const { id: audienceId } = await context.params;
    const body: any = await request.json();
    const contactId = String(body.contactId ?? "");
    await addAudienceMember(ctx, audienceId, contactId);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (isAppError(error)) {
      const status =
        error.code === "UNAUTHENTICATED"
          ? 401
          : error.code === "FORBIDDEN"
          ? 403
          : error.code === "NOT_FOUND"
          ? 404
          : error.code === "CONFLICT"
          ? 409
          : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "Invalid membership." }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await resolveWorkspace();
    const { id: audienceId } = await context.params;
    const url = new URL(request.url);
    const contactId = url.searchParams.get("contactId") || "";
    const ok = await removeAudienceMember(ctx, audienceId, contactId);
    if (!ok) return NextResponse.json({ error: "Member not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isAppError(error)) {
      const status = error.code === "UNAUTHENTICATED" ? 401 : error.code === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "Unable to remove member." }, { status: 400 });
  }
}
