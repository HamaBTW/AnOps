import { NextResponse } from "next/server";
import { resolveWorkspace } from "@/server/tenancy/workspace";
import { disconnectSocialAccount } from "@/server/services/social-account.service";
import { isAppError } from "@/shared/lib/errors";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await resolveWorkspace();
    const { id } = await context.params;
    const ok = await disconnectSocialAccount(ctx, id);
    if (!ok) return NextResponse.json({ error: "Social account not found." }, { status: 404 });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (isAppError(error)) {
      const status = error.code === "UNAUTHENTICATED" ? 401 : error.code === "FORBIDDEN" ? 403 : 404;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "Unable to disconnect account." }, { status: 400 });
  }
}
