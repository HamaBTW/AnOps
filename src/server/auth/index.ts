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
        const user = await db.collection("users").findOne({ email: normalizedEmail });

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

        return {
          id: user._id.toString(),
          email: user.email as string,
          name: (user.name as string) || (user.email as string).split("@")[0],
          status,
          emailVerified: (user.emailVerified as Date | null) ?? null,
        };
      },
    }),
  ],
});
