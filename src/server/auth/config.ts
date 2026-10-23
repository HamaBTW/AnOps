import type { NextAuthConfig } from "next-auth";
import type { AccountStatus } from "@/server/auth/types";

/**
 * Edge-safe auth config. Contains NO database imports so it can be used in
 * proxy.ts (edge runtime). The full config in ./index.ts spreads this and adds
 * the adapter + credentials provider.
 */
export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.status = user.status ?? "active";
        token.emailVerified = user.emailVerified ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? "";
        session.user.status = (token.status as AccountStatus) ?? "active";
        session.user.emailVerified = (token.emailVerified as Date | null) ?? null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
