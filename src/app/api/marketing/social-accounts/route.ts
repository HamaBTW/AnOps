import { NextResponse } from "next/server";
import { resolveWorkspace } from "@/server/tenancy/workspace";
import { listSocialAccounts } from "@/server/services/social-account.service";
import { isAppError } from "@/shared/lib/errors";

export async function GET() {
  try {
    const ctx = await resolveWorkspace();
    const accounts = await listSocialAccounts(ctx);
    return NextResponse.json(accounts);
  } catch (error) {
    if (isAppError(error)) {
      const status = error.code === "UNAUTHENTICATED" ? 401 : error.code === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "Unable to load social accounts." }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json(
    { error: "OAuth provider configuration is required; accounts cannot be manually connected without provider credentials." },
    { status: 503 }
  );
}
