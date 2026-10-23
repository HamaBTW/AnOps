"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import clientPromise from "@/server/db/client";
import { registerSchema } from "@/features/auth/schemas/auth.schema";

export type RegisterResult = {
  ok: boolean;
  message: string;
};

export async function registerUser(data: unknown): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message || "Invalid data" };
  }

  const { name, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  try {
    const client = await clientPromise;
    const db = client.db();
    const users = db.collection("users");

    const existing = await users.findOne({ email: normalizedEmail });
    if (existing) {
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

    if (process.env.NODE_ENV !== "production") {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      console.info(`[auth] Verify email for ${normalizedEmail}: ${baseUrl}/verify?token=${verificationToken}`);
    }

    return { ok: true, message: "Account created. Check your email to verify." };
  } catch (error) {
    console.error("registerUser error", error);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}
