import { NextResponse } from "next/server";
import { resolveWorkspace } from "@/server/tenancy/workspace";
import { listSocialAttempts } from "@/server/services/social.service";
import { isAppError } from "@/shared/lib/errors";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await resolveWorkspace();
    const { id } = await context.params;
    const history = await listSocialAttempts(ctx, id);
    return NextResponse.json(history);
  } catch (error) {
    if (isAppError(error)) {
      const status = error.code === "UNAUTHENTICATED" ? 401 : error.code === "FORBIDDEN" ? 403 : 404;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }
}
