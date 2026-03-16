import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

import { SignupForm } from "@/components/auth/signup-form";

export default async function SignupPage() {
  const session = await auth();

  if (session?.user) {
    redirect(session.user.role === "ADMIN" ? "/admin" : "/minha-conta");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center gap-10 px-6 py-16">
      <div className="max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Primeiro acesso</p>
        <h1 className="font-display mt-4 text-4xl font-semibold md:text-5xl">
          Crie sua conta e comece a responder diagnosticos personalizados.
        </h1>
      </div>
      <SignupForm />
    </main>
  );
}
