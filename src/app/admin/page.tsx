import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  const [models, links, users] = await Promise.all([
    prisma.diagnosticModel.findMany({
      include: {
        nodes: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.diagnosticLink.findMany({
      include: {
        model: true,
        assignedUser: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    }),
    prisma.user.count(),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <section className="grid gap-4 md:grid-cols-3">
        <Card className="bg-white/90">
          <CardHeader>
            <CardDescription>Usuarios cadastrados</CardDescription>
            <CardTitle className="font-display text-4xl">{users}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-white/90">
          <CardHeader>
            <CardDescription>Modelos ativos</CardDescription>
            <CardTitle className="font-display text-4xl">{models.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-white/90">
          <CardHeader>
            <CardDescription>Links recentes</CardDescription>
            <CardTitle className="font-display text-4xl">{links.length}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="mt-10 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="bg-white/90">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Modelos de diagnostico</CardTitle>
            <CardDescription>Base inicial para a Fase 2 com CRUD e construtor de fluxo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {models.map((model) => (
              <div key={model.id} className="rounded-2xl border border-border/70 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold">{model.name}</p>
                    <p className="text-sm text-muted-foreground">{model.description ?? "Sem descricao"}</p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                    {model.status}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-600">{model.nodes.length} nos cadastrados</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-white/90">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Links gerados</CardTitle>
            <CardDescription>Visao preliminar dos envios mais recentes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {links.map((link) => (
              <div key={link.id} className="rounded-2xl border border-border/70 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold">{link.label ?? "Link sem identificador"}</p>
                    <p className="text-sm text-muted-foreground">{link.model.name}</p>
                  </div>
                  <span className="rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent-foreground">
                    {link.status}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  Destinatario: {link.assignedUser?.name ?? "Ainda nao vinculado"}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
