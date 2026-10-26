import { NextResponse } from "next/server";
import { resolveWorkspace } from "@/server/tenancy/workspace";
import { recordConsent, listConsentHistory } from "@/server/services/marketing.service";
import { isAppError } from "@/shared/lib/errors";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await resolveWorkspace();
    const { id } = await context.params;
    const history = await listConsentHistory(ctx, id);
    return NextResponse.json(history);
  } catch (error) {
    if (isAppError(error)) {
      const status = error.code === "UNAUTHENTICATED" ? 401 : error.code === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "Unable to load consent history." }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await resolveWorkspace();
    const { id } = await context.params;
    const body: unknown = await request.json();
    const consent = await recordConsent(ctx, id, body);
    return NextResponse.json(consent, { status: 201 });
  } catch (error) {
    if (isAppError(error)) {
      const status =
        error.code === "UNAUTHENTICATED"
          ? 401
          : error.code === "FORBIDDEN"
          ? 403
          : error.code === "NOT_FOUND"
          ? 404
          : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "Invalid consent record." }, { status: 400 });
  }
}
