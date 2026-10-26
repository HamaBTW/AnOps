import { NextResponse } from "next/server";
import { resolveWorkspace } from "@/server/tenancy/workspace";
import { getMarketingAnalytics } from "@/server/services/marketing-analytics.service";
import { isAppError } from "@/shared/lib/errors";

export async function GET() {
  try {
    const ctx = await resolveWorkspace();
    const analytics = await getMarketingAnalytics(ctx);
    return NextResponse.json(analytics);
  } catch (error) {
    if (isAppError(error)) {
      const status = error.code === "UNAUTHENTICATED" ? 401 : error.code === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "Unable to load marketing analytics." }, { status: 500 });
  }
}
