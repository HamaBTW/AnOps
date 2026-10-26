import { NextResponse } from "next/server";
import { resolveWorkspace } from "@/server/tenancy/workspace";
import { transitionCampaign } from "@/server/services/marketing.service";
import { enqueueCampaignDeliveries } from "@/server/marketing/delivery.service";
import { isAppError } from "@/shared/lib/errors";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await resolveWorkspace();
    const { id } = await context.params;
    const body: any = await request.json();
    const command = String(body?.command ?? "");

    if (!["submit", "approve", "reject", "schedule", "dispatch", "cancel", "retry"].includes(command)) {
      return NextResponse.json({ error: "Unsupported campaign command." }, { status: 400 });
    }

    const nextStatus = await transitionCampaign(ctx, id, command as any);

    // If dispatching, also enqueue deliveries
    if (command === "dispatch") {
      await enqueueCampaignDeliveries(ctx, id);
    }

    return NextResponse.json({ status: nextStatus });
  } catch (error) {
    if (isAppError(error)) {
      const status =
        error.code === "UNAUTHENTICATED"
          ? 401
          : error.code === "FORBIDDEN"
          ? 403
          : error.code === "CONFLICT"
          ? 409
          : error.code === "NOT_FOUND"
          ? 404
          : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "Unable to update campaign." }, { status: 400 });
  }
}
