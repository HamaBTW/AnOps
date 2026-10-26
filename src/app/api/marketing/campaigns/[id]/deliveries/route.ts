import { NextResponse } from "next/server";
import { resolveWorkspace } from "@/server/tenancy/workspace";
import {
  enqueueCampaignDeliveries,
  getDeliverySummary,
  listDeliveries,
  retryDelivery,
  cancelDelivery,
} from "@/server/marketing/delivery.service";
import { isAppError } from "@/shared/lib/errors";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await resolveWorkspace();
    const { id } = await context.params;
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? "1");
    const pageSize = Number(url.searchParams.get("pageSize") ?? "20");

    const [summary, deliveries] = await Promise.all([
      getDeliverySummary(ctx, id),
      listDeliveries(ctx, id, page, pageSize),
    ]);

    return NextResponse.json({ summary, deliveries });
  } catch (error) {
    if (isAppError(error)) {
      const status = error.code === "UNAUTHENTICATED" ? 401 : error.code === "FORBIDDEN" ? 403 : 404;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "Unable to load delivery records." }, { status: 404 });
  }
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await resolveWorkspace();
    const { id } = await context.params;
    const result = await enqueueCampaignDeliveries(ctx, id);
    return NextResponse.json(
      {
        ...result,
        message: result.providerConfigured
          ? "Deliveries queued for sending."
          : "Deliveries queued, but external provider is unconfigured. No live messages will be sent.",
      },
      { status: 202 }
    );
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
    return NextResponse.json({ error: "Unable to queue deliveries." }, { status: 400 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await resolveWorkspace();
    const body: any = await request.json();
    const deliveryId = String(body?.deliveryId ?? "");
    const action = String(body?.action ?? "");

    if (action === "retry") {
      const ok = await retryDelivery(ctx, deliveryId);
      if (!ok) return NextResponse.json({ error: "Delivery not eligible for retry." }, { status: 409 });
      return NextResponse.json({ ok: true });
    }

    if (action === "cancel") {
      const ok = await cancelDelivery(ctx, deliveryId);
      if (!ok) return NextResponse.json({ error: "Delivery not eligible for cancellation." }, { status: 409 });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unsupported delivery action." }, { status: 400 });
  } catch (error) {
    if (isAppError(error)) {
      const status = error.code === "UNAUTHENTICATED" ? 401 : error.code === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "Unable to update delivery." }, { status: 400 });
  }
}
