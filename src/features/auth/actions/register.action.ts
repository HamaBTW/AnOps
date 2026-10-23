"use server";

import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import clientPromise from "@/server/db/client";
import { registerSchema } from "@/features/auth/schemas/auth.schema";
import { sendVerificationEmail } from "@/server/email";

export type RegisterResult = {
  ok: boolean;
  message: string;
  email?: {
    delivered: boolean;
    reason?: "not_configured" | "error";
    error?: string;
  };
};

export async function registerUser(data: unknown): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message || "Invalid data" };
  }

  const { name, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();
  console.info(`[auth] register: creating account for ${normalizedEmail}`);

  try {
    const client = await clientPromise;
    const db = client.db();
    const users = db.collection("users");

    const existing = await users.findOne({ email: normalizedEmail });
    if (existing) {
      console.warn(`[auth] register blocked: ${normalizedEmail} already exists`);
      return { ok: false, message: "An account with this email already exists" };
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationToken = randomBytes(32).toString("hex");

    await users.insertOne({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      emailVerified: null,
      status: "unverified",
      verificationToken,
      verificationTokenExpires: new Date(Date.now() + 1000 * 60 * 60 * 24),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    let email: RegisterResult["email"];
    try {
      const mailResult = await sendVerificationEmail(
        normalizedEmail,
        name.trim(),
        verificationToken
      );
      email = mailResult.delivered
        ? { delivered: true }
        : { delivered: false, reason: mailResult.reason, error: mailResult.error };
    } catch (mailError) {
      console.error("[auth] Unexpected error sending verification email", mailError);
      email = { delivered: false, reason: "error", error: String(mailError) };
    }

    return {
      ok: true,
      message: email.delivered
        ? "Account created. Check your email to verify."
        : "Account created, but the verification email could not be sent.",
      email,
    };
  } catch (error) {
    console.error("registerUser error", error);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}
