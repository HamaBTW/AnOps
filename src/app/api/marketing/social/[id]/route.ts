import { NextResponse } from "next/server";
import { resolveWorkspace } from "@/server/tenancy/workspace";
import { getSocialPost, updateSocialPost, duplicateSocialPost, transitionSocialPost } from "@/server/services/social.service";
import { isAppError } from "@/shared/lib/errors";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await resolveWorkspace();
    const { id } = await context.params;
    const post = await getSocialPost(ctx, id);
    return NextResponse.json(post);
  } catch (error) {
    if (isAppError(error)) {
      const status = error.code === "UNAUTHENTICATED" ? 401 : error.code === "FORBIDDEN" ? 403 : 404;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "Social post not found." }, { status: 404 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await resolveWorkspace();
    const { id } = await context.params;
    const body: unknown = await request.json();
    const updated = await updateSocialPost(ctx, id, body);
    return NextResponse.json(updated);
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
    return NextResponse.json({ error: "Only editable drafts can be updated." }, { status: 409 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await resolveWorkspace();
    const { id } = await context.params;
    const body: any = await request.json();
    const action = String(body?.action ?? "");

    if (action === "duplicate") {
      const copy = await duplicateSocialPost(ctx, id);
      return NextResponse.json(copy, { status: 201 });
    }

    if (["submit", "approve", "schedule", "cancel", "retry"].includes(action)) {
      const targetStatus = await transitionSocialPost(ctx, id, action as any);
      return NextResponse.json({ ok: true, status: targetStatus });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error) {
    if (isAppError(error)) {
      const status =
        error.code === "UNAUTHENTICATED"
          ? 401
          : error.code === "FORBIDDEN"
          ? 403
          : error.code === "CONFLICT"
          ? 409
          : error.code === "VALIDATION_ERROR"
          ? 400
          : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "Post action is not valid for its current state." }, { status: 409 });
  }
}
