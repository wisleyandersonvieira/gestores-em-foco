import { notFound, redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DiagnosticResultPage({
  params,
}: {
  params: { linkId: string };
}) {
  const session = await auth();

  if (!session?.user) {
    redirect(`/entrar?callbackUrl=/minha-conta/diagnostico/${params.linkId}/resultado`);
  }

  const link = await prisma.diagnosticLink.findFirst({
    where: {
      id: params.linkId,
      assignedUserId: session.user.id,
    },
    include: {
      model: true,
      responses: {
        include: {
          node: true,
        },
        orderBy: {
          answeredAt: "asc",
        },
      },
    },
  });

  if (!link) {
    notFound();
  }

  const numericAnswers = link.responses
    .map((response) => Number(response.answerValue))
    .filter((value) => Number.isFinite(value));

  const generalScore = numericAnswers.length
    ? Math.round((numericAnswers.reduce((sum, current) => sum + current, 0) / (numericAnswers.length * 5)) * 100)
    : 0;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Card className="surface-panel border-none">
        <CardHeader>
          <CardTitle className="font-display text-3xl">{link.model.name}</CardTitle>
          <CardDescription>
            Resultado preliminar da Fase 1. Nas proximas entregas, este relatorio ganhara radar chart, maturidade por categoria e recomendacoes automaticas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-3xl bg-primary p-6 text-primary-foreground">
            <p className="text-sm uppercase tracking-[0.2em] text-primary-foreground/70">Score geral</p>
            <p className="font-display mt-3 text-5xl font-semibold">{generalScore}%</p>
          </div>

          <div className="space-y-4">
            {link.responses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ainda nao ha respostas registradas para este diagnostico.</p>
            ) : (
              link.responses.map((response) => (
                <div key={response.id} className="rounded-2xl border border-border/70 bg-white/85 p-4">
                  <p className="text-sm text-muted-foreground">{response.node.category ?? "Sem categoria"}</p>
                  <p className="mt-1 font-medium">{response.node.questionText ?? response.node.label ?? "Pergunta"}</p>
                  <p className="mt-2 text-sm text-slate-600">Resposta: {response.answerValue}</p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
