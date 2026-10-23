import { MongoDBAdapter } from "@auth/mongodb-adapter";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import clientPromise from "@/server/db/client";
import { loginSchema } from "@/features/auth/schemas/auth.schema";
import { authConfig } from "@/server/auth/config";
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
        const client = await clientPromise;
        const db = client.db();
        const user = await db.collection("users").findOne({ email: email.toLowerCase().trim() });

        if (!user || !user.password) return null;

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return null;

        if (user.status === "banned") {
          throw new BannedError();
        }

        const status: AccountStatus =
          (user.status as AccountStatus | undefined) ??
          (user.emailVerified ? "active" : "unverified");

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
