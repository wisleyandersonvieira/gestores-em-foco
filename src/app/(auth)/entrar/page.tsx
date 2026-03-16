import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect(session.user.role === "ADMIN" ? "/admin" : "/minha-conta");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center gap-10 px-6 py-16 lg:flex-row lg:justify-between">
      <div className="max-w-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Acesso seguro</p>
        <h1 className="font-display mt-4 text-4xl font-semibold leading-tight md:text-5xl">
          Entre para acompanhar seu diagnostico empresarial.
        </h1>
        <p className="mt-6 text-lg leading-8 text-slate-600">
          Seu progresso, historico e relatorios ficam disponiveis em uma experiencia pensada para uso rapido no desktop e no mobile.
        </p>
      </div>
      <Suspense fallback={<div className="h-[420px] w-full max-w-md rounded-3xl bg-white/70" />}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
