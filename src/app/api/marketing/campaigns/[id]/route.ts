import { NextResponse } from "next/server";
import { resolveWorkspace } from "@/server/tenancy/workspace";
import { getCampaign, updateCampaign, duplicateCampaign } from "@/server/services/marketing.service";
import { isAppError } from "@/shared/lib/errors";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await resolveWorkspace();
    const { id } = await context.params;
    const campaign = await getCampaign(ctx, id);
    return NextResponse.json(campaign);
  } catch (error) {
    if (isAppError(error)) {
      const status = error.code === "UNAUTHENTICATED" ? 401 : error.code === "FORBIDDEN" ? 403 : 404;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await resolveWorkspace();
    const { id } = await context.params;
    const body: unknown = await request.json();
    const updated = await updateCampaign(ctx, id, body);
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
    return NextResponse.json({ error: "Invalid campaign update." }, { status: 400 });
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
    const copy = await duplicateCampaign(ctx, id);
    return NextResponse.json(copy, { status: 201 });
  } catch (error) {
    if (isAppError(error)) {
      const status = error.code === "UNAUTHENTICATED" ? 401 : error.code === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "Unable to duplicate campaign." }, { status: 400 });
  }
}
