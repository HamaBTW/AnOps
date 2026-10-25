import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { listSocialAttempts } from "@/server/services/social.service";
import { requireMarketingPermission } from "@/server/services/marketing.service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  try {
    return NextResponse.json(await listSocialAttempts(await requireMarketingPermission(session.user.email, "marketing.social.read"), (await context.params).id));
  } catch {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }
}
