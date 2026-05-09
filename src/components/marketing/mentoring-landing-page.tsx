import { Link } from "react-router-dom";
import {
  ArrowRight,
  Award,
  BookOpen,
  BriefcaseBusiness,
  GraduationCap,
  LayoutDashboard,
  MessagesSquare,
  Presentation,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const aboutPillars = [
  { icon: Award, title: "Experiência", text: "Vivência prática com gestores, lideranças e empresas em diferentes fases de crescimento." },
  { icon: Target, title: "Resultados", text: "Programas focados em clareza, priorização e execução para melhorar a rotina de gestão." },
  { icon: ShieldCheck, title: "Metodologia Própria", text: "Jornadas estruturadas para diagnosticar, orientar e acompanhar a evolução empresarial." },
];

const products = [
  { icon: GraduationCap, name: "Cursos Presenciais", text: "Formações intensivas para gestores que valorizam troca direta, prática aplicada e desenvolvimento em grupo." },
  { icon: BookOpen, name: "Cursos Online", text: "Conteúdos digitais para desenvolver liderança, estratégia e rotina de gestão no seu próprio ritmo.", href: "/cursos", cta: "Ver cursos" },
  { icon: Presentation, name: "Palestras", text: "Encontros de alto impacto para eventos, empresas e comunidades empresariais." },
  { icon: LayoutDashboard, name: "Soluções", text: "Ferramentas digitais para diagnosticar, organizar e acompanhar a gestão da sua empresa.", href: "/solucoes", cta: "Ver soluções" },
  { icon: Rocket, name: "Imersões", text: "Experiências profundas para acelerar decisões e transformar a gestão da empresa." },
  { icon: MessagesSquare, name: "Mentorias", text: "Acompanhamento individual ou em grupo para evoluir como gestor e dono de empresa." },
  { icon: BriefcaseBusiness, name: "Consultorias", text: "Projetos consultivos para ajustar processos, estratégia e indicadores de gestão." },
];

const steps = [
  "Crie sua conta gratuita",
  "Escolha o produto ideal para você",
  "Acesse o conteúdo e transforme sua gestão",
  "Acompanhe sua evolução",
];

const testimonials = [
  { quote: "A mentoria nos ajudou a organizar prioridades e melhorar a tomada de decisão da diretoria.", author: "Mariana Costa", role: "Diretora Executiva" },
  { quote: "O diagnóstico mostrou com clareza onde nossa gestão precisava de processo e acompanhamento.", author: "Rafael Nunes", role: "Sócio fundador" },
  { quote: "Os encontros trouxeram linguagem prática para liderar melhor e cobrar execução sem perder alinhamento.", author: "Bianca Rocha", role: "Gerente de Operações" },
];

export function MentoringLandingPage() {
  return (
    <div className="relative overflow-hidden">
      <SiteHeader />
      <main>
        <section className="relative bg-primary text-primary-foreground">
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(26,54,93,0.96),rgba(15,23,42,0.88)),url('/placeholder.svg')] bg-cover bg-center" />
          <div className="relative mx-auto grid min-h-[calc(100vh-80px)] max-w-7xl content-center gap-10 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <Badge className="mb-6 border-accent/30 bg-accent/15 text-accent">GESTORES EM FOCO</Badge>
              <h1 className="font-display max-w-3xl text-4xl font-semibold leading-tight md:text-6xl">
                Transforme a gestão da sua empresa
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-primary-foreground/80">
                Mentoria empresarial, cursos, soluções digitais, palestras e imersões para gestores e donos de empresas que querem resultados reais.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                  <a href="#produtos">
                    Conhecer nossos produtos
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                  <Link to="/entrar">Acessar Minha Conta</Link>
                </Button>
              </div>
            </div>
            <div className="grid gap-4">
              <Card className="border-white/15 bg-white/10 text-white backdrop-blur">
                <CardContent className="grid gap-4 p-6 sm:grid-cols-3">
                  {["Mentorias", "Cursos", "Soluções"].map((label) => (
                    <div key={label} className="rounded-lg border border-white/15 bg-white/10 p-4">
                      <Sparkles className="mb-4 h-5 w-5 text-accent" />
                      <p className="font-semibold">{label}</p>
                      <p className="mt-1 text-sm text-white/70">para evoluir a gestão</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="border-white/15 bg-white text-primary">
                  <CardHeader>
                    <CardDescription>Foco da jornada</CardDescription>
                    <CardTitle className="text-2xl">Gestores e donos</CardTitle>
                  </CardHeader>
                </Card>
                <Card className="border-accent/25 bg-accent text-accent-foreground">
                  <CardHeader>
                    <CardDescription className="text-accent-foreground/70">Entrega</CardDescription>
                    <CardTitle className="text-2xl">Resultados reais</CardTitle>
                  </CardHeader>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section id="quem-somos" className="mx-auto max-w-7xl px-6 py-20">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Quem somos</p>
              <h2 className="font-display mt-3 text-3xl font-semibold md:text-4xl">Especialistas no desenvolvimento de gestores.</h2>
              <p className="mt-5 text-base leading-8 text-muted-foreground">
                A Gestores em Foco desenvolve gestores e donos de empresas por meio de mentorias, cursos, soluções digitais, palestras, imersões e consultorias. Nossa metodologia combina diagnóstico, orientação prática e acompanhamento para melhorar decisões, processos e resultados.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {aboutPillars.map((pillar) => (
                <Card key={pillar.title} className="h-full border-primary/10 bg-white/90 shadow-sm">
                  <CardHeader>
                    <pillar.icon className="h-9 w-9 text-accent" />
                    <CardTitle className="text-xl">{pillar.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 text-sm leading-6 text-muted-foreground">{pillar.text}</CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="produtos" className="bg-white py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-10 max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Nossos produtos</p>
              <h2 className="font-display mt-3 text-3xl font-semibold md:text-4xl">Educação empresarial para cada momento da sua gestão.</h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.name} product={product} />
              ))}
            </div>
          </div>
        </section>

        <section id="como-funciona" className="mx-auto max-w-7xl px-6 py-20">
          <div className="mb-10 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Como funciona</p>
            <h2 className="font-display mt-3 text-3xl font-semibold md:text-4xl">Uma jornada simples para aprender, aplicar e evoluir.</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-4">
            {steps.map((step, index) => (
              <Card key={step} className="border-primary/10 bg-white/90">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-lg font-semibold text-primary-foreground">
                    {index + 1}
                  </div>
                  <CardTitle className="text-xl">{step}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section id="depoimentos" className="bg-secondary/70 py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-10 max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Depoimentos</p>
              <h2 className="font-display mt-3 text-3xl font-semibold md:text-4xl">Histórias de gestores em evolução.</h2>
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              {testimonials.map((item) => (
                <Card key={item.author} className="border-primary/10 bg-white">
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
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-20">
          <Card className="overflow-hidden border-none bg-primary text-primary-foreground">
            <CardContent className="flex flex-col gap-8 p-8 md:flex-row md:items-center md:justify-between md:p-10">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-primary-foreground/70">Próximo passo</p>
                <h2 className="font-display mt-3 text-3xl font-semibold">Entre na plataforma e acompanhe sua evolução empresarial.</h2>
              </div>
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/entrar">Acessar Minha Conta</Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

type Product = (typeof products)[number];

function ProductCard({ product }: { product: Product }) {
  const content = (
    <Card className={`flex h-full flex-col border-primary/10 bg-background/80 shadow-sm transition ${product.href ? "hover:-translate-y-1 hover:shadow-lg" : ""}`}>
      <CardHeader className="gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <product.icon className="h-6 w-6" />
        </div>
        <div>
          <CardTitle className="text-xl">{product.name}</CardTitle>
          <CardDescription className="mt-3 leading-6">{product.text}</CardDescription>
        </div>
        {product.cta ? (
          <span className="mt-auto inline-flex items-center gap-2 pt-2 text-sm font-semibold text-primary">
            {product.cta}
            <ArrowRight className="h-4 w-4" />
          </span>
        ) : null}
      </CardHeader>
    </Card>
  );

  if (!product.href) return content;

  return (
    <Link to={product.href} className="block h-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
      {content}
    </Link>
  );
}
