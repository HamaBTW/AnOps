import { NextResponse } from "next/server";
import { resolveWorkspace } from "@/server/tenancy/workspace";
import { deleteTag } from "@/server/services/marketing.service";
import { isAppError } from "@/shared/lib/errors";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await resolveWorkspace();
    const { id } = await context.params;
    const ok = await deleteTag(ctx, id);
    if (!ok) return NextResponse.json({ error: "Tag not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isAppError(error)) {
      const status = error.code === "UNAUTHENTICATED" ? 401 : error.code === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "Unable to delete tag." }, { status: 500 });
  }
}
