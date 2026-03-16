import { Radar, RadarChart, PolarAngleAxis, PolarGrid } from "recharts";
import { AlertCircle, CheckCircle2, CircleDashed } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { CategoryMaturity, DiagnosticReportPayload } from "@/types/diagnostic-report";

const chartConfig = {
  score: {
    label: "Score",
    color: "hsl(var(--primary))",
  },
};

function maturityMeta(maturity: CategoryMaturity) {
  if (maturity === "attention") {
    return {
      label: "Atencao necessaria",
      icon: <AlertCircle className="h-4 w-4 text-destructive" />,
      badgeClass: "bg-destructive/10 text-destructive",
    };
  }

  if (maturity === "developing") {
    return {
      label: "Em desenvolvimento",
      icon: <CircleDashed className="h-4 w-4 text-amber-600" />,
      badgeClass: "bg-amber-500/10 text-amber-700",
    };
  }

  return {
    label: "Saudavel",
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
    badgeClass: "bg-emerald-500/10 text-emerald-700",
  };
}

type DiagnosticReportViewProps = {
  report: DiagnosticReportPayload;
};

export function DiagnosticReportView({ report }: DiagnosticReportViewProps) {
  const chartData = report.categories.map((category) => ({
    category: category.categoryName,
    score: category.scorePercent,
  }));

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="surface-panel border-none">
          <CardHeader>
            <CardDescription>Score geral</CardDescription>
            <CardTitle className="font-display text-5xl">{report.overallScore}%</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-7 text-muted-foreground">{report.summary}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-muted p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Fortes</p>
                <p className="mt-2 text-sm font-medium">{report.strengths.join(", ") || "Nenhum destaque ainda"}</p>
              </div>
              <div className="rounded-2xl bg-muted p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Prioridade</p>
                <p className="mt-2 text-sm font-medium">{report.weaknesses.join(", ") || "Sem alerta critico"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="surface-panel border-none">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Radar por categoria</CardTitle>
            <CardDescription>Visao comparativa da maturidade em cada eixo do diagnostico.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="mx-auto h-[320px] w-full max-w-[560px]">
              <RadarChart data={chartData}>
                <ChartTooltip content={<ChartTooltipContent />} />
                <PolarGrid />
                <PolarAngleAxis dataKey="category" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <Radar dataKey="score" stroke="var(--color-score)" fill="var(--color-score)" fillOpacity={0.28} />
              </RadarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {report.categories.map((category) => {
          const meta = maturityMeta(category.maturity);

          return (
            <Card key={category.categoryId} className="bg-white/90">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardDescription>{category.categoryName}</CardDescription>
                    <CardTitle className="font-display text-3xl">{category.scorePercent}%</CardTitle>
                  </div>
                  <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${meta.badgeClass}`}>
                    {meta.icon}
                    {meta.label}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-7 text-muted-foreground">{category.recommendation}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section>
        <Card className="bg-white/90">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Respostas por categoria</CardTitle>
            <CardDescription>Abra cada bloco para revisar respostas e interpretar os sinais do diagnostico.</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {report.categories.map((category, index) => (
                <AccordionItem key={category.categoryId} value={`category-${index}`}>
                  <AccordionTrigger>
                    <div className="flex w-full items-center justify-between gap-4 pr-4 text-left">
                      <div>
                        <p className="font-medium">{category.categoryName}</p>
                        <p className="text-sm text-muted-foreground">{category.answers.length} respostas registradas</p>
                      </div>
                      <span className="text-sm font-semibold text-primary">{category.scorePercent}%</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      {category.answers.map((answer) => (
                        <div key={answer.questionId} className="rounded-2xl bg-muted p-4">
                          <p className="font-medium">{answer.questionTitle}</p>
                          <p className="mt-2 text-sm text-muted-foreground">Resposta: {answer.answerLabel}</p>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
