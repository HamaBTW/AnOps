import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAuthUser } from "@/server/auth/rbac";
import { getLeaveRecommendation } from "@/server/services/hr-advisor.service";

const paramsSchema = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) });

type RouteContext = { params: Promise<{ id: string }> };

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

async function respond(context: RouteContext, refresh: boolean) {
  const user = await getCurrentAuthUser();
  if (!user) return errorResponse("UNAUTHENTICATED", "Please log in to continue.", 401);
  if (!user.isAdmin) return errorResponse("FORBIDDEN", "Only HR administrators can view the Approval Advisor.", 403);

  const params = paramsSchema.safeParse(await context.params);
  if (!params.success) return errorResponse("NOT_FOUND", "Leave request not found.", 404);

  try {
    const outcome = await getLeaveRecommendation(
      params.data.id,
      {
        userId: user.userId,
        employeeId: user.employee?.id,
        companyId: user.companyId,
        role: user.role,
        actorName: user.employee?.fullName || user.email,
      },
      { refresh }
    );
    if (outcome.status === "not_found") return errorResponse("NOT_FOUND", "Leave request not found.", 404);
    if (outcome.status !== "ok") return errorResponse("CONFLICT", "This request is no longer pending.", 409);
    return NextResponse.json({ data: outcome.card }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err) {
    console.error("[advisor route]", err instanceof Error ? err.name : "unknown");
    return errorResponse("INTERNAL", "The analysis is unavailable right now.", 500);
  }
}

/** The advisor card for a pending request: cached when its facts are unchanged. */
export function GET(_request: Request, context: RouteContext) {
  return respond(context, false);
}

/** Regenerates the analysis ("Refresh analysis"). */
export function POST(_request: Request, context: RouteContext) {
  return respond(context, true);
}
