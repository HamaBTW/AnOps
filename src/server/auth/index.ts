import { MongoDBAdapter } from "@auth/mongodb-adapter";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import type { ObjectId } from "mongodb";
import clientPromise from "@/server/db/client";
import { loginSchema } from "@/features/auth/schemas/auth.schema";
import { authConfig } from "@/server/auth/config";
import { issueVerificationEmail } from "@/server/auth/verification";
import type { AccountStatus } from "@/server/auth/types";

class BannedError extends CredentialsSignin {
  code = "banned";
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const normalizedEmail = email.toLowerCase().trim();
        console.info(`[auth] sign-in attempt for ${normalizedEmail}`);

        const client = await clientPromise;
        const db = client.db();
        let user = await db.collection("users").findOne({ email: normalizedEmail });

        const envAdminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
        const envAdminPassword = process.env.ADMIN_PASSWORD;

        if (!user && envAdminEmail && normalizedEmail === envAdminEmail && envAdminPassword && password === envAdminPassword) {
          const hashedPassword = await bcrypt.hash(envAdminPassword, 12);
          const adminDoc = {
            name: process.env.ADMIN_NAME || "System Administrator",
            email: envAdminEmail,
            password: hashedPassword,
            role: "hr_admin",
            status: "active",
            emailVerified: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          const res = await db.collection("users").insertOne(adminDoc);
          user = { _id: res.insertedId, ...adminDoc };
        }

        if (!user || !user.password) {
          console.warn(`[auth] sign-in failed for ${normalizedEmail}: user not found or no password`);
          return null;
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
          console.warn(`[auth] sign-in failed for ${normalizedEmail}: invalid password`);
          return null;
        }

        if (user.status === "banned") {
          console.warn(`[auth] sign-in blocked for ${normalizedEmail}: banned`);
          throw new BannedError();
        }

        const status: AccountStatus =
          (user.status as AccountStatus | undefined) ??
          (user.emailVerified ? "active" : "unverified");

        console.info(`[auth] sign-in authorized for ${normalizedEmail} (status=${status})`);

        if (status === "unverified") {
          const outcome = await issueVerificationEmail(
            {
              _id: user._id as ObjectId,
              email: user.email,
              name: user.name,
              status: user.status,
              emailVerified: user.emailVerified,
              verificationSentAt: user.verificationSentAt,
            },
            { force: false }
          );

          if (outcome.status === "sent") {
            console.info(`[auth] auto verification email sent to ${normalizedEmail}`);
          } else if (outcome.status === "throttled") {
            console.info(
              `[auth] auto verification email skipped for ${normalizedEmail} (one was sent less than 1 minute ago)`
            );
          }
        }

        const employee = await db.collection("employees").findOne({ email: normalizedEmail });
        let hrRole = (employee?.role as "employee" | "manager" | "hr_admin" | undefined) ||
                     (user.role as "employee" | "manager" | "hr_admin" | undefined);

        if (!hrRole) {
          if (envAdminEmail && normalizedEmail === envAdminEmail) {
            hrRole = "hr_admin";
          } else {
            hrRole = "employee";
          }
        }

        return {
          id: user._id.toString(),
          email: user.email as string,
          name: (user.name as string) || (user.email as string).split("@")[0],
          status,
          emailVerified: (user.emailVerified as Date | null) ?? null,
          role: hrRole,
          forcePasswordReset: Boolean(user.forcePasswordReset),
        };
      },
    }),
  ],
});
