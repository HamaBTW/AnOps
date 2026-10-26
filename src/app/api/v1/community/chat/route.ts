import { NextRequest, NextResponse } from "next/server";
import { getActiveTenant } from "@/server/tenant/context";
import { getChatMessages } from "@/server/services/community.service";

export async function GET(req: NextRequest) {
  try {
    const tenant = await getActiveTenant();
    if (!tenant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");
    const after = searchParams.get("after") || undefined;

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: 400 }
      );
    }

    const messages = await getChatMessages(
      tenant.companyId,
      conversationId,
      after
    );

    return NextResponse.json({ data: messages });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load messages" },
      { status: 500 }
    );
  }
}
