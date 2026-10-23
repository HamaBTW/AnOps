import type { DefaultSession } from "next-auth";
import type { JWT } from "next-auth/jwt";

export type AccountStatus = "active" | "unverified" | "banned";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      status: AccountStatus;
      emailVerified: Date | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    status?: AccountStatus;
    emailVerified?: Date | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    status?: AccountStatus;
    emailVerified?: Date | null;
  }
}

export type { JWT };
