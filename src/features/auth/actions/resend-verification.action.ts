"use server";

import clientPromise from "@/server/db/client";
import { forgotPasswordSchema } from "@/features/auth/schemas/auth.schema";
import {
  issueVerificationEmail,
  type VerificationUser,
} from "@/server/auth/verification";

export type ResendVerificationResult = {
  error?: string;
  success?: string;
  warning?: string;
};

const GENERIC_SUCCESS =
  "If this account needs verification, a new verification link has been sent.";

export async function resendVerificationAction(
  _prev: ResendVerificationResult,
  formData: FormData
): Promise<ResendVerificationResult> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid email" };
  }

  const email = parsed.data.email.toLowerCase().trim();
  console.info(`[auth] verification resend requested for ${email}`);

  try {
    const client = await clientPromise;
    const db = client.db();
    const users = db.collection("users");

    const user = await users.findOne({ email });
    if (!user) {
      console.warn(`[auth] verification resend: no user found for ${email} — no email sent`);
      return { success: GENERIC_SUCCESS };
    }

    if (user.status === "banned") {
      console.warn(`[auth] verification resend: ${email} is banned — no email sent`);
      return { success: GENERIC_SUCCESS };
    }

    if (user.status === "active" || user.emailVerified) {
      console.info(`[auth] verification resend: ${email} is already verified — no email sent`);
      return { success: GENERIC_SUCCESS };
    }

    const outcome = await issueVerificationEmail(user as VerificationUser, { force: true });

    if (outcome.status === "failed") {
      return {
        warning:
          outcome.reason === "not_configured"
            ? "Email delivery is not configured on this server. In development, the verification link is printed in the server console."
            : "We couldn't send the verification email. Please check the server logs and try again.",
      };
    }

    return { success: "Verification email sent. Check your inbox." };
  } catch (error) {
    console.error("[auth] resendVerificationAction error", error);
    return { error: "Something went wrong. Please try again." };
  }
}
