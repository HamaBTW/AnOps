import { NextResponse } from "next/server";
import { resolveWorkspace } from "@/server/tenancy/workspace";
import { listAudiences, createAudience } from "@/server/services/marketing.service";
import { isAppError } from "@/shared/lib/errors";

export async function GET() {
  try {
    const ctx = await resolveWorkspace();
    const audiences = await listAudiences(ctx);
    return NextResponse.json(audiences);
  } catch (error) {
    if (isAppError(error)) {
      const status = error.code === "UNAUTHENTICATED" ? 401 : error.code === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "Unable to load audiences." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await resolveWorkspace();
    const body: unknown = await request.json();
    const audience = await createAudience(ctx, body);
    return NextResponse.json(audience, { status: 201 });
  } catch (error) {
    if (isAppError(error)) {
      const status = error.code === "UNAUTHENTICATED" ? 401 : error.code === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "Invalid audience data." }, { status: 400 });
  }
}
