import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { fetchAllProviderModels } from "@/server/ai/fetch-models";

/**
 * GET /api/ai/models
 *
 * Returns the live list of available models from every configured AI provider.
 * Requires an authenticated session.
 * Results are effectively cached for 5 minutes via the server-side fetch cache.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const providers = await fetchAllProviderModels();
    return NextResponse.json({ providers });
  } catch (err) {
    console.error("[GET /api/ai/models]", err);
    return NextResponse.json({ error: "Failed to fetch models" }, { status: 500 });
  }
}
