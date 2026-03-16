import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AccountDashboardPage() {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  const links = await prisma.diagnosticLink.findMany({
    where: {
      assignedUserId: session.user.id,
    },
    include: {
      model: true,
      responses: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="surface-panel border-none">
          <CardHeader>
            <CardTitle className="font-display text-3xl">Iniciar um diagnostico</CardTitle>
            <CardDescription>Cole o link que voce recebeu para acessar um novo fluxo de perguntas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="https://seudominio.com/diagnostico/token" />
            <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Iniciar Diagnostico</Button>
            <p className="text-sm text-muted-foreground">
              Na proxima fase, esse campo vai validar o token e encaminhar automaticamente para a rota publica do diagnostico.
            </p>
          </CardContent>
        </Card>

        <Card className="surface-panel border-none">
          <CardHeader>
            <CardTitle className="font-display text-3xl">Resumo da conta</CardTitle>
            <CardDescription>Dados basicos da empresa usados para personalizar o acompanhamento.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-muted-foreground">Empresa</p>
              <p className="mt-1 font-semibold">{session.user.companyName ?? "Nao informada"}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-muted-foreground">Diagnosticos vinculados</p>
              <p className="mt-1 font-semibold">{links.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <section className="mt-10">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold">Historico de diagnosticos</h2>
            <p className="text-sm text-muted-foreground">Acompanhe os links recebidos e o status de cada resposta.</p>
          </div>
        </div>

        <div className="grid gap-4">
          {links.length === 0 ? (
            <Card className="border-dashed bg-white/70">
              <CardContent className="p-6 text-sm text-muted-foreground">
                Nenhum diagnostico foi associado a esta conta ainda.
              </CardContent>
            </Card>
          ) : (
            links.map((link) => (
              <Card key={link.id} className="bg-white/85">
                <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold">{link.model.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {link.label ?? "Link sem identificador"} • {new Intl.DateTimeFormat("pt-BR").format(link.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                      {link.status}
                    </span>
                    <Button asChild variant="outline">
                      <Link href={`/minha-conta/diagnostico/${link.id}/resultado`}>Ver resultado</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
