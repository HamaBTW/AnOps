"use server";

import bcrypt from "bcryptjs";
import clientPromise from "@/server/db/client";
import { resetPasswordSchema } from "@/features/auth/schemas/auth.schema";

export type ResetPasswordResult = {
  ok: boolean;
  message: string;
};

export async function resetPassword(data: unknown): Promise<ResetPasswordResult> {
  const parsed = resetPasswordSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message || "Invalid data" };
  }

  const { token, password } = parsed.data;

  try {
    const client = await clientPromise;
    const db = client.db();
    const users = db.collection("users");

    const user = await users.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return { ok: false, message: "Invalid or expired reset token" };
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          password: hashedPassword,
          updatedAt: new Date(),
        },
        $unset: {
          passwordResetToken: "",
          passwordResetExpires: "",
        },
      }
    );

    return { ok: true, message: "Password updated. You can now sign in." };
  } catch (error) {
    console.error("resetPassword error", error);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}
