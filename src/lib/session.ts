import type { DefaultSession } from "next-auth";

export type AppRole = "ADMIN" | "CLIENT";

export type AppSessionUser = DefaultSession["user"] & {
  id: string;
  role: AppRole;
  companyName?: string | null;
};
