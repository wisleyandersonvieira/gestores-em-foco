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
    description:
      "Mapeie a maturidade da sua empresa, identifique pontos de melhoria e receba uma análise organizada para definir prioridades de gestão.",
    complement:
      "Ideal para empresários que desejam entender com clareza onde estão os principais gargalos da operação, da gestão financeira, dos processos e da tomada de decisão.",
    benefits: [
      "Avaliação da maturidade da empresa",
      "Identificação de pontos críticos",
      "Relatório para tomada de decisão",
      "Direcionamento de prioridades",
    ],
    href: "/login?produto=diagnostico",
  },
  {
    icon: BarChart3,
    title: "Gestão de DRE",
    description:
      "Monte, acompanhe e analise o Demonstrativo de Resultado da sua empresa de forma simples, visual e estruturada.",
    complement:
      "Ideal para empresas que precisam acompanhar receitas, custos, despesas, margens e resultados por competência, com uma visão clara da performance do negócio.",
    benefits: [
      "Estruturação do demonstrativo de resultado",
      "Análise de receitas, custos e despesas",
      "Acompanhamento de margem e resultado",
      "Visão por competência",
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
        <section className="border-b border-border/70 bg-secondary/50">
          <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
            <Badge className="bg-accent text-accent-foreground">SOLUÇÕES DIGITAIS</Badge>
            <h1 className="font-display mt-5 max-w-4xl text-4xl font-semibold leading-tight md:text-5xl">
              Produtos para organizar e evoluir sua gestão
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
              Conheça as ferramentas disponíveis para diagnosticar, acompanhar e melhorar a performance da sua empresa.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-14 md:py-20">
          <div className="mb-10 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Soluções para gestão empresarial</p>
            <h2 className="font-display mt-3 text-3xl font-semibold md:text-4xl">
              Escolha a ferramenta ideal para melhorar a análise, o controle e a tomada de decisão da sua empresa.
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {solutions.map((solution) => (
              <Card key={solution.title} className="flex h-full flex-col border-primary/10 bg-card shadow-sm">
                <CardHeader className="gap-5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <solution.icon className="h-7 w-7" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">{solution.title}</CardTitle>
                    <CardDescription className="mt-3 text-base leading-7">{solution.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="mt-auto space-y-6">
                  <p className="text-sm leading-6 text-muted-foreground">{solution.complement}</p>
                  <ul className="grid gap-3 text-sm text-foreground">
                    {solution.benefits.map((benefit) => (
                      <li key={benefit} className="flex gap-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
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
