"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/server/actions/run-action";
import { PERMISSIONS } from "@/server/security/permissions";
import { requireMarketing } from "@/server/marketing/common";
import { testEmailProvider } from "@/server/marketing/providers";
import {
  EMAIL_INTEGRATION_CHECK_ID,
  recordIntegrationCheck,
  type IntegrationCheck,
} from "@/server/marketing/integration-status";
import type { ActionResult } from "@/shared/lib/errors";

export type EmailIntegrationTestResult = {
  ok: boolean;
  errorCode: string | null;
  providerName: string | null;
  checkedAt: string;
};

/**
 * Verifies the SMTP handshake and login without sending a message. Testing is
 * limited to roles that can dispatch campaigns, and the result is recorded so the
 * Integrations page can distinguish configured from tested.
 */
export async function testEmailIntegrationAction(): Promise<ActionResult<EmailIntegrationTestResult>> {
  return runAction(
    "marketing.integration.test-email",
    async (ctx) => {
      requireMarketing(ctx, PERMISSIONS.MARKETING_CAMPAIGN_DISPATCH);
      const result = await testEmailProvider();
      const check: IntegrationCheck = await recordIntegrationCheck(
        ctx.db,
        EMAIL_INTEGRATION_CHECK_ID,
        { ok: result.ok, errorCode: result.errorCode },
        ctx.userId
      );
      revalidatePath("/marketing/integrations");
      return { ...result, checkedAt: check.checkedAt.toISOString() };
    },
    { rateLimit: { limit: 3, windowMs: 60_000 } }
  );
}
