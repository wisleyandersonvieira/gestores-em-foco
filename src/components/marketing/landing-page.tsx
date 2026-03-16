import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  CircleHelp,
  LineChart,
  Megaphone,
  Users2,
  Wallet,
} from "lucide-react";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const steps = [
  "Receba seu link personalizado",
  "Responda o diagnostico em poucos minutos",
  "Receba insights claros para agir com prioridade",
];

const pillars = [
  { icon: Wallet, title: "Gestao Financeira", text: "Entenda gargalos de caixa, margem e previsibilidade." },
  { icon: BriefcaseBusiness, title: "Processos Internos", text: "Mapeie rotinas, padroes e eficiencia operacional." },
  { icon: Users2, title: "Lideranca e Equipe", text: "Avalie alinhamento, autonomia e capacidade de execucao." },
  { icon: Megaphone, title: "Marketing e Vendas", text: "Descubra onde a aquisicao e a conversao travam." },
  { icon: LineChart, title: "Estrategia e Crescimento", text: "Meça foco, prioridades e maturidade para escalar." },
];

const testimonials = [
  {
    quote: "Em uma semana conseguimos identificar onde cada empresa da turma precisava de apoio imediato.",
    author: "Paula Mendes",
    role: "Mentora de aceleracao",
  },
  {
    quote: "O diagnostico virou nossa porta de entrada para consultorias mais assertivas e valiosas.",
    author: "Andre Luiz",
    role: "Organizador de summit empresarial",
  },
  {
    quote: "Os alunos passaram a enxergar seus pontos cegos com clareza e aceitaram melhor o plano de acao.",
    author: "Carla Faria",
    role: "Coach de negocios",
  },
];

const faqs = [
  {
    question: "A plataforma funciona para turmas e mentorias individuais?",
    answer: "Sim. O mesmo modelo de diagnostico pode gerar varios links unicos para mentorias 1:1, cohorts e summits.",
  },
  {
    question: "Preciso ter equipe tecnica para operar?",
    answer: "Nao. O objetivo do produto e permitir que o time admin crie modelos, distribua links e acompanhe resultados em um painel simples.",
  },
  {
    question: "O aluno precisa responder tudo de uma vez?",
    answer: "Nao. O progresso do diagnostico fica salvo, permitindo retomar depois sem perder respostas.",
  },
  {
    question: "Consigo personalizar categorias e perguntas?",
    answer: "Sim. O construtor com mapa mental foi pensado exatamente para adaptar o fluxo ao seu metodo.",
  },
];

export function LandingPage() {
  return (
    <div className="relative overflow-hidden">
      <SiteHeader />
      <main>
        <section className="mx-auto grid max-w-7xl gap-12 px-6 pb-20 pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:pt-24">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
              <CheckCircle2 className="h-4 w-4" />
              Diagnosticos empresariais para educacao e mentoria
            </div>
            <h1 className="font-display max-w-3xl text-4xl font-semibold leading-tight text-foreground md:text-6xl">
              Descubra o que esta travando o crescimento do seu negocio.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Transforme respostas em insights acionaveis. Mentores, coaches e organizadores enviam links personalizados,
              acompanham o progresso e entregam um diagnostico com profundidade real.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/cadastro">
                  Fazer meu Diagnostico
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-primary/20 bg-white/70">
                <Link to="/entrar">Acessar minha conta</Link>
              </Button>
            </div>
          </div>

          <div className="surface-panel relative overflow-hidden p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.18),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(30,64,175,0.15),transparent_30%)]" />
            <div className="relative space-y-4">
              <div className="rounded-3xl border border-primary/10 bg-white p-5">
                <p className="text-sm font-medium text-muted-foreground">Status da turma</p>
                <p className="font-display mt-3 text-4xl font-semibold text-primary">82%</p>
                <p className="mt-2 text-sm text-muted-foreground">dos participantes finalizaram o diagnostico desta rodada.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="border-primary/10 bg-foreground text-background">
                  <CardHeader>
                    <CardDescription className="text-background/70">Categoria critica</CardDescription>
                    <CardTitle className="text-xl">Marketing e Vendas</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 text-sm text-background/70">48% de maturidade media entre os participantes.</CardContent>
                </Card>
                <Card className="border-accent/20 bg-accent/10">
                  <CardHeader>
                    <CardDescription>Melhor indicador</CardDescription>
                    <CardTitle className="text-xl text-accent-foreground">Processos Internos</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 text-sm text-muted-foreground">71% de consistencia operacional nas respostas.</CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section id="como-funciona" className="mx-auto max-w-7xl px-6 py-20">
          <div className="mb-10 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Como funciona</p>
            <h2 className="font-display mt-3 text-3xl font-semibold md:text-4xl">Uma jornada simples para gerar diagnosticos com profundidade.</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => (
              <Card key={step} className="surface-panel border-none">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-lg font-semibold text-primary-foreground">
                    {index + 1}
                  </div>
                  <CardTitle className="mt-4 text-2xl">{step}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section id="pilares" className="mx-auto max-w-7xl px-6 py-20">
          <div className="surface-panel p-8 md:p-10">
            <div className="mb-10 max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Pilares do diagnostico</p>
              <h2 className="font-display mt-3 text-3xl font-semibold md:text-4xl">Os cinco eixos que revelam a saude do negocio.</h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
              {pillars.map((pillar) => (
                <Card key={pillar.title} className="h-full border-primary/10 bg-white/80">
                  <CardHeader>
                    <pillar.icon className="h-10 w-10 text-accent" />
                    <CardTitle className="text-xl">{pillar.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 text-sm leading-6 text-muted-foreground">{pillar.text}</CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="depoimentos" className="mx-auto max-w-7xl px-6 py-20">
          <div className="grid gap-6 lg:grid-cols-3">
            {testimonials.map((item) => (
              <Card key={item.author} className="surface-panel border-none">
                <CardContent className="p-8">
                  <p className="text-lg leading-8 text-muted-foreground">"{item.quote}"</p>
                  <div className="mt-8">
                    <p className="font-semibold text-foreground">{item.author}</p>
                    <p className="text-sm text-muted-foreground">{item.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-8 px-6 py-20 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Sobre a plataforma</p>
            <h2 className="font-display mt-3 text-3xl font-semibold md:text-4xl">
              Pensada para programas de transformacao empresarial.
            </h2>
          </div>
          <div className="space-y-4 text-lg leading-8 text-muted-foreground">
            <p>
              Gestores em Foco centraliza diagnostico, distribuicao de links, respostas e relatorios em um unico ambiente.
            </p>
            <p>
              O foco esta em mentores, coaches e organizadores de summits que precisam escalar atendimento sem perder personalizacao.
            </p>
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-4xl px-6 py-20">
          <div className="mb-10 flex items-center gap-3">
            <CircleHelp className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">FAQ</p>
              <h2 className="font-display text-3xl font-semibold">Perguntas frequentes</h2>
            </div>
          </div>
          <Accordion type="single" collapsible className="surface-panel px-6">
            {faqs.map((faq, index) => (
              <AccordionItem key={faq.question} value={`item-${index}`}>
                <AccordionTrigger className="text-left text-base font-medium">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-base leading-7 text-muted-foreground">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-24">
          <Card className="overflow-hidden border-none bg-primary text-primary-foreground">
            <CardContent className="flex flex-col gap-8 p-8 md:flex-row md:items-center md:justify-between md:p-10">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-primary-foreground/70">Pronto para a primeira rodada?</p>
                <h2 className="font-display mt-3 text-3xl font-semibold">Comece com a base pronta para escalar seus diagnosticos.</h2>
              </div>
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/cadastro">Criar minha conta</Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
