import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, CheckCircle2, ClipboardCheck } from "lucide-react";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const solutions = [
  {
    icon: ClipboardCheck,
    title: "Diagnóstico Empresarial",
    description: "Mapeie a maturidade da sua empresa e identifique prioridades de melhoria com clareza.",
    benefits: [
      "Avaliação da maturidade da gestão",
      "Identificação de pontos críticos",
      "Relatório para tomada de decisão",
    ],
    href: "/login?produto=diagnostico",
  },
  {
    icon: BarChart3,
    title: "Gestão de DRE",
    description: "Monte, acompanhe e analise o resultado da empresa de forma simples, visual e estruturada.",
    benefits: [
      "Estruturação do DRE",
      "Análise de receitas, custos e despesas",
      "Acompanhamento de margem e resultado",
    ],
    href: "/login?produto=gestor-dre",
  },
];

export default function SolucoesPage() {
  useEffect(() => {
    document.title = "Soluções para Gestão Empresarial";
    setMetaDescription("Ferramentas digitais para diagnóstico empresarial, gestão de DRE e acompanhamento da performance da empresa.");
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="border-b border-border/70 bg-secondary/45">
          <div className="mx-auto grid max-w-[1200px] gap-8 px-6 py-10 md:py-14 lg:grid-cols-[1fr_340px] lg:items-center">
            <div>
              <Badge className="bg-accent text-accent-foreground">SOLUÇÕES DIGITAIS</Badge>
              <h1 className="font-display mt-4 max-w-[850px] text-3xl font-semibold leading-tight md:text-5xl">
                Produtos para organizar e evoluir sua gestão
              </h1>
              <p className="mt-4 max-w-[720px] text-base leading-7 text-muted-foreground md:text-lg">
                Conheça ferramentas digitais para diagnosticar, acompanhar e melhorar a performance da sua empresa.
              </p>
            </div>

            <Card className="hidden border-primary/10 bg-card/95 shadow-sm lg:block">
              <CardContent className="p-5">
                <p className="font-display text-lg font-semibold">Soluções para decisões melhores</p>
                <ul className="mt-4 grid gap-3 text-sm text-muted-foreground">
                  {["Diagnóstico da gestão", "Controle de resultados", "Acesso após login"].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-accent" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-6 py-8 md:py-10">
          <div className="mb-6 max-w-2xl">
            <h2 className="font-display text-2xl font-semibold md:text-3xl">Soluções disponíveis</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Assine a ferramenta que melhor atende o momento da sua empresa.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {solutions.map((solution) => (
              <Card key={solution.title} className="flex h-full flex-col border-primary/10 bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <CardHeader className="space-y-4 p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <solution.icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div>
                    <CardTitle className="text-xl md:text-2xl">{solution.title}</CardTitle>
                    <CardDescription className="mt-3 text-sm leading-6">{solution.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="mt-auto space-y-5 p-5 pt-0">
                  <ul className="grid gap-3 text-sm text-foreground">
                    {solution.benefits.map((benefit) => (
                      <li key={benefit} className="flex gap-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                  <Button asChild className="w-full bg-primary hover:bg-primary/90 sm:w-auto">
                    <Link to={solution.href}>
                      Assinar
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function setMetaDescription(content: string) {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "description";
    document.head.appendChild(meta);
  }
  meta.content = content;
}
