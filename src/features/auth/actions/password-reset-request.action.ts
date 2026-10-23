"use server";

import { randomBytes } from "crypto";
import clientPromise from "@/server/db/client";
import { forgotPasswordSchema } from "@/features/auth/schemas/auth.schema";
import { sendPasswordResetEmail } from "@/server/email";

export type ForgotPasswordResult = {
  ok: boolean;
  message: string;
  emailAttempted: boolean;
  emailDelivered: boolean;
  emailReason?: "not_configured" | "error";
  emailError?: string;
};

export async function requestPasswordReset(data: unknown): Promise<ForgotPasswordResult> {
  const parsed = forgotPasswordSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message || "Invalid email",
      emailAttempted: false,
      emailDelivered: false,
    };
  }

  const email = parsed.data.email.toLowerCase().trim();
  console.info(`[auth] password reset requested for ${email}`);

  try {
    const client = await clientPromise;
    const db = client.db();
    const users = db.collection("users");

    const user = await users.findOne({ email });
    if (!user) {
      console.warn(`[auth] password reset: no user found for ${email} — no email sent`);
      return {
        ok: true,
        message: "If an account exists, a reset link has been sent.",
        emailAttempted: false,
        emailDelivered: false,
      };
    }

    const token = randomBytes(32).toString("hex");
    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordResetToken: token,
          passwordResetExpires: new Date(Date.now() + 1000 * 60 * 60),
          updatedAt: new Date(),
        },
      }
    );

    const name = typeof user.name === "string" && user.name.length > 0 ? user.name : email;

    try {
      const mailResult = await sendPasswordResetEmail(email, name, token);
      if (!mailResult.delivered) {
        console.error(
          `[auth] Password reset email NOT delivered to ${email} (reason=${mailResult.reason ?? "unknown"}${mailResult.error ? `, error=${mailResult.error}` : ""})`
        );
        return {
          ok: true,
          message: "If an account exists, a reset link has been sent.",
          emailAttempted: true,
          emailDelivered: false,
          emailReason: mailResult.reason,
          emailError: mailResult.error,
        };
      }

      return {
        ok: true,
        message: "If an account exists, a reset link has been sent.",
        emailAttempted: true,
        emailDelivered: true,
      };
    } catch (mailError) {
      console.error("[auth] Unexpected error sending password reset email", mailError);
      return {
        ok: true,
        message: "If an account exists, a reset link has been sent.",
        emailAttempted: true,
        emailDelivered: false,
        emailReason: "error",
        emailError: String(mailError),
      };
    }
  } catch (error) {
    console.error("requestPasswordReset error", error);
    return {
      ok: false,
      message: "Something went wrong. Please try again.",
      emailAttempted: false,
      emailDelivered: false,
    };
  }
}
