import { NextResponse } from "next/server";
import { resolveWorkspace } from "@/server/tenancy/workspace";
import { getTemplate, updateTemplate, archiveTemplate, duplicateTemplate } from "@/server/services/marketing.service";
import { isAppError } from "@/shared/lib/errors";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await resolveWorkspace();
    const { id } = await context.params;
    const template = await getTemplate(ctx, id);
    return NextResponse.json(template);
  } catch (error) {
    if (isAppError(error)) {
      const status = error.code === "UNAUTHENTICATED" ? 401 : error.code === "FORBIDDEN" ? 403 : 404;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await resolveWorkspace();
    const { id } = await context.params;
    const body: unknown = await request.json();
    const updated = await updateTemplate(ctx, id, body);
    return NextResponse.json(updated);
  } catch (error) {
    if (isAppError(error)) {
      const status = error.code === "UNAUTHENTICATED" ? 401 : error.code === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "Invalid template update." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await resolveWorkspace();
    const { id } = await context.params;
    const ok = await archiveTemplate(ctx, id);
    if (!ok) return NextResponse.json({ error: "Template not found." }, { status: 404 });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (isAppError(error)) {
      const status = error.code === "UNAUTHENTICATED" ? 401 : error.code === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await resolveWorkspace();
    const { id } = await context.params;
    const body: any = await request.json();
    if (body?.action !== "duplicate") {
      return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
    }
    const copy = await duplicateTemplate(ctx, id);
    return NextResponse.json(copy, { status: 201 });
  } catch (error) {
    if (isAppError(error)) {
      const status = error.code === "UNAUTHENTICATED" ? 401 : error.code === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "Unable to duplicate template." }, { status: 400 });
  }
}
