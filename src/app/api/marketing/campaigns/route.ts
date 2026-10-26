import { NextResponse } from "next/server";
import { resolveWorkspace } from "@/server/tenancy/workspace";
import { listCampaigns, createCampaign } from "@/server/services/marketing.service";
import { isAppError } from "@/shared/lib/errors";

export async function GET() {
  try {
    const ctx = await resolveWorkspace();
    const campaigns = await listCampaigns(ctx);
    return NextResponse.json(campaigns);
  } catch (error) {
    if (isAppError(error)) {
      const status = error.code === "UNAUTHENTICATED" ? 401 : error.code === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "Unable to load campaigns." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await resolveWorkspace();
    const body: unknown = await request.json();
    const campaign = await createCampaign(ctx, body);
    return NextResponse.json(campaign, { status: 201 });
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
    return NextResponse.json({ error: "Invalid campaign data." }, { status: 400 });
  }
}
