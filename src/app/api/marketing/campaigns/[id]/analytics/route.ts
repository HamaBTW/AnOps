import { NextResponse } from "next/server";
import { resolveWorkspace } from "@/server/tenancy/workspace";
import { getDeliverySummary } from "@/server/marketing/delivery.service";
import { isAppError } from "@/shared/lib/errors";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await resolveWorkspace();
    const { id } = await context.params;
    const summary = await getDeliverySummary(ctx, id);
    const total = summary.total;
    const delivered = summary.byStatus.delivered ?? summary.byStatus.sent ?? 0;
    const failed = summary.byStatus.failed ?? 0;
    const deliveryRate = total > 0 ? Math.round((delivered / total) * 1000) / 10 : null;
    const failureRate = total > 0 ? Math.round((failed / total) * 1000) / 10 : null;

    return NextResponse.json({
      total,
      byStatus: summary.byStatus,
      deliveryRate,
      failureRate,
      unavailableMetrics: ["opens", "clicks"],
    });
  } catch (error) {
    if (isAppError(error)) {
      const status = error.code === "UNAUTHENTICATED" ? 401 : error.code === "FORBIDDEN" ? 403 : 404;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "Unable to load campaign analytics." }, { status: 404 });
  }
}
