import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { SignOutButton } from "@/components/platform/sign-out-button";
import { auth } from "@/lib/auth";

type AccountLayoutProps = {
  children: ReactNode;
};

export default async function AccountLayout({ children }: AccountLayoutProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/entrar?callbackUrl=/minha-conta");
  }

  if (session.user.role === "ADMIN") {
    redirect("/admin");
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/70 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="font-display text-xl font-semibold">Minha Conta</p>
            <p className="text-sm text-muted-foreground">{session.user.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm font-medium text-muted-foreground transition hover:text-foreground">
              Voltar ao site
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
