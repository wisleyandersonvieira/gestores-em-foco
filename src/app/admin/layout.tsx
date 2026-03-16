import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { SignOutButton } from "@/components/platform/sign-out-button";
import { auth } from "@/lib/auth";

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/entrar?callbackUrl=/admin");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/minha-conta");
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/70 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="font-display text-xl font-semibold">Painel Administrativo</p>
            <p className="text-sm text-slate-300">Controle de modelos, links e resultados</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-slate-300 transition hover:text-white">
              Ver site
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
