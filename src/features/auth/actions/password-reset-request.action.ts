"use server";

import { randomBytes } from "crypto";
import clientPromise from "@/server/db/client";
import { forgotPasswordSchema } from "@/features/auth/schemas/auth.schema";
import { sendPasswordResetEmail } from "@/server/email";

export type ForgotPasswordResult = {
  ok: boolean;
  message: string;
};

export async function requestPasswordReset(data: unknown): Promise<ForgotPasswordResult> {
  const parsed = forgotPasswordSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message || "Invalid email" };
  }

  const email = parsed.data.email.toLowerCase().trim();

  try {
    const client = await clientPromise;
    const db = client.db();
    const users = db.collection("users");

    const user = await users.findOne({ email });
    if (user) {
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

      try {
        await sendPasswordResetEmail(email, (user.name as string) || email, token);
      } catch (mailError) {
        console.error("sendPasswordResetEmail error", mailError);
      }
    }

    return { ok: true, message: "If an account exists, a reset link has been sent." };
  } catch (error) {
    console.error("requestPasswordReset error", error);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}
