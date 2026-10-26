import { NextResponse } from "next/server";
import { resolveWorkspace } from "@/server/tenancy/workspace";
import { listTags, createTag } from "@/server/services/marketing.service";
import { isAppError } from "@/shared/lib/errors";

export async function GET() {
  try {
    const ctx = await resolveWorkspace();
    const tags = await listTags(ctx);
    return NextResponse.json(tags);
  } catch (error) {
    if (isAppError(error)) {
      const status = error.code === "UNAUTHENTICATED" ? 401 : error.code === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "Unable to load tags." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await resolveWorkspace();
    const body: unknown = await request.json();
    const tag = await createTag(ctx, body);
    return NextResponse.json(tag, { status: 201 });
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
    return NextResponse.json({ error: "Unable to create tag." }, { status: 400 });
  }
}
