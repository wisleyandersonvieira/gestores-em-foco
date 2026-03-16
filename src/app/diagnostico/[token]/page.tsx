import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function PublicDiagnosticPage({
  params,
}: {
  params: { token: string };
}) {
  const link = await prisma.diagnosticLink.findUnique({
    where: {
      token: params.token,
    },
    include: {
      model: true,
    },
  });

  if (!link) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle>Link invalido</CardTitle>
            <CardDescription>O token informado nao corresponde a nenhum diagnostico disponivel.</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  if (link.expiresAt && link.expiresAt < new Date()) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle>Link expirado</CardTitle>
            <CardDescription>Este diagnostico nao esta mais disponivel para resposta.</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  const session = await auth();

  if (!session?.user) {
    redirect(`/entrar?callbackUrl=/diagnostico/${params.token}`);
  }

  if (link.assignedUserId && link.assignedUserId !== session.user.id) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle>Acesso restrito</CardTitle>
            <CardDescription>Este diagnostico foi vinculado a outra conta.</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl items-center px-6 py-16">
      <Card className="w-full border-primary/10 bg-white/90">
        <CardHeader>
          <CardTitle className="font-display text-3xl">{link.model.name}</CardTitle>
          <CardDescription>
            O token foi validado com sucesso. Na proxima fase, esta tela passara a renderizar o fluxo dinamico do diagnostico.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-2xl bg-slate-50 p-5">
            <p className="text-sm text-muted-foreground">Identificador</p>
            <p className="mt-1 font-medium">{link.label ?? "Sem identificador"}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-5">
            <p className="text-sm text-muted-foreground">Status atual</p>
            <p className="mt-1 font-medium">{link.status}</p>
          </div>
          <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Link href="/minha-conta">Ir para minha conta</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
