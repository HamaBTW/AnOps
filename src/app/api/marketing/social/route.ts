import { NextResponse } from "next/server";
import { resolveWorkspace } from "@/server/tenancy/workspace";
import { listSocialPosts, createSocialPost } from "@/server/services/social.service";
import { isAppError } from "@/shared/lib/errors";

export async function GET(request: Request) {
  try {
    const ctx = await resolveWorkspace();
    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? undefined;
    const posts = await listSocialPosts(ctx, status);
    return NextResponse.json(posts);
  } catch (error) {
    if (isAppError(error)) {
      const status = error.code === "UNAUTHENTICATED" ? 401 : error.code === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "Unable to load social posts." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await resolveWorkspace();
    const body: unknown = await request.json();
    const post = await createSocialPost(ctx, body);
    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    if (isAppError(error)) {
      const status =
        error.code === "UNAUTHENTICATED"
          ? 401
          : error.code === "FORBIDDEN"
          ? 403
          : error.code === "NOT_FOUND"
          ? 404
          : error.code === "VALIDATION_ERROR"
          ? 400
          : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "Invalid social post data." }, { status: 400 });
  }
}
