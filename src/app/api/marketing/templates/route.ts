import { NextResponse } from "next/server";
import { resolveWorkspace } from "@/server/tenancy/workspace";
import { listTemplates, createTemplate } from "@/server/services/marketing.service";
import { isAppError } from "@/shared/lib/errors";

export async function GET(request: Request) {
  try {
    const ctx = await resolveWorkspace();
    const search = new URL(request.url).searchParams.get("search") ?? "";
    const templates = await listTemplates(ctx, search);
    return NextResponse.json(templates);
  } catch (error) {
    if (isAppError(error)) {
      const status = error.code === "UNAUTHENTICATED" ? 401 : error.code === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "Unable to load templates." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await resolveWorkspace();
    const body: unknown = await request.json();
    const template = await createTemplate(ctx, body);
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    if (isAppError(error)) {
      const status = error.code === "UNAUTHENTICATED" ? 401 : error.code === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "Invalid template data." }, { status: 400 });
  }
}
