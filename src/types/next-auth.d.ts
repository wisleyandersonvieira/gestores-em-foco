import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: "ADMIN" | "CLIENT";
      companyName?: string | null;
    };
  }

  interface User {
    role: "ADMIN" | "CLIENT";
    companyName?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "ADMIN" | "CLIENT";
    companyName?: string | null;
  }
}
