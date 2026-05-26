import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Award,
  BookOpen,
  Briefcase,
  Cpu,
  Factory,
  GraduationCap,
  Heart,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Target,
  Users,
} from "lucide-react";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { getAvailableProducts, PRODUCT_SLUGS } from "@/lib/products";

const heroFeatures = [
  { icon: Users, label: "Comunidade", sub: "para trocar experiências" },
  { icon: GraduationCap, label: "Cursos", sub: "para evoluir a gestão" },
  { icon: Settings, label: "Soluções", sub: "para organizar a gestão" },
];

const aboutPillars = [
  { icon: Award, title: "Experiência", text: "Vivência prática com gestores, lideranças e empresas em diferentes fases de crescimento." },
  { icon: Target, title: "Resultados", text: "Programas focados em clareza, priorização e execução para melhorar a rotina de gestão." },
  { icon: ShieldCheck, title: "Metodologia Própria", text: "Jornadas estruturadas para diagnosticar, orientar e acompanhar a evolução empresarial." },
];

const products = [
  { icon: BookOpen, name: "Cursos Online", text: "Conteúdos digitais para desenvolver liderança, estratégia e rotina de gestão no seu próprio ritmo.", href: "/cursos", cta: "Ver cursos", slug: PRODUCT_SLUGS.courses },
  { icon: LayoutDashboard, name: "Soluções", text: "Ferramentas digitais para diagnosticar, organizar e acompanhar a gestão da sua empresa.", href: "/solucoes", cta: "Ver soluções", solutionShelf: true },
];

const communitySectors = [
  { icon: Factory, label: "Indústria" },
  { icon: ShoppingCart, label: "Comércio" },
  { icon: Briefcase, label: "Serviços" },
  { icon: Heart, label: "Saúde" },
  { icon: GraduationCap, label: "Educação" },
  { icon: Cpu, label: "Tecnologia" },
];

const steps = [
  "Crie sua conta gratuita",
  "Escolha seu curso, solução ou comunidade",
  "Acesse o conteúdo e transforme sua gestão",
  "Acompanhe sua evolução",
];

export function MentoringLandingPage() {
  const [visibleProductSlugs, setVisibleProductSlugs] = useState<Set<string> | null>(null);

  useEffect(() => {
    getAvailableProducts()
      .then((availableProducts) => setVisibleProductSlugs(new Set(availableProducts.map((product) => product.slug))))
      .catch(() => setVisibleProductSlugs(new Set()));
  }, []);

  const visibleProducts = useMemo(() => {
    if (!visibleProductSlugs) return products;
    const hasVisibleSolution = visibleProductSlugs.has(PRODUCT_SLUGS.diagnostics) || visibleProductSlugs.has(PRODUCT_SLUGS.dre);
    return products.filter((product) => {
      if ("slug" in product && product.slug) return visibleProductSlugs.has(product.slug);
      if ("solutionShelf" in product && product.solutionShelf) return hasVisibleSolution;
      return true;
    });
  }, [visibleProductSlugs]);

  return (
    <div className="overflow-hidden">
      <SiteHeader />
      <main>

        {/* HERO */}
        <section className="bg-[#0F1B33] text-white">
          <div className="mx-auto grid min-h-[calc(100vh-76px)] max-w-7xl content-center gap-10 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <div className="mb-6 inline-flex items-center rounded-full border border-[#E8712B] px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#E8712B]">
                GESTORES EM FOCO
              </div>
              <h1 className="max-w-xl text-5xl font-bold leading-[1.1] text-white md:text-[56px]">
                Transforme a gestão da sua empresa
              </h1>
              <p className="mt-6 max-w-[520px] text-[17px] leading-[1.7] text-white/75">
                Cursos práticos, soluções digitais e uma comunidade exclusiva para gestores e donos de empresas que querem resultados reais.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <a
                  href="#produtos"
                  className="inline-flex items-center justify-center gap-2 rounded-[6px] border border-[#E8712B] px-6 py-3 text-sm font-semibold text-[#E8712B] transition-all duration-200 hover:bg-[#E8712B] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8712B] focus-visible:ring-offset-2"
                >
                  Conhecer nossos produtos
                  <ArrowRight className="h-4 w-4" />
                </a>
                <Link
                  to="/entrar"
                  className="inline-flex items-center justify-center rounded-[6px] border border-white/20 bg-[#1B2A4A] px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:border-[#E8712B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8712B] focus-visible:ring-offset-2"
                >
                  Acessar Minha Conta
                </Link>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[10px] border border-white/10 bg-white/[0.06] p-5">
                <div className="grid gap-4 sm:grid-cols-3">
                  {heroFeatures.map((item) => (
                    <div key={item.label} className="rounded-[8px] border border-white/10 bg-white/[0.06] p-4">
                      <item.icon className="mb-3 h-6 w-6 text-[#E8712B]" />
                      <p className="font-semibold text-white">{item.label}</p>
                      <p className="mt-1 text-sm text-white/65">{item.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[8px] border border-white/15 bg-white p-5">
                  <p className="text-sm text-[#4A5568]">Foco da jornada</p>
                  <p className="mt-1 text-2xl font-bold text-[#1B2A4A]">Gestores e donos</p>
                </div>
                <div className="rounded-[8px] bg-[#E8712B] p-5">
                  <p className="text-sm text-white/75">Entrega</p>
                  <p className="mt-1 text-2xl font-bold text-white">Resultados reais</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* QUEM SOMOS */}
        <section id="quem-somos" className="bg-[#F7F8FA] py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
              <div>
                <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-[#E8712B]">Quem somos</p>
                <h2 className="mt-3 text-4xl font-bold leading-[1.2] text-[#1A1A2E]">
                  Especialistas no desenvolvimento de gestores.
                </h2>
                <p className="mt-5 text-[17px] leading-[1.7] text-[#4A5568]">
                  A Gestores em Foco desenvolve gestores e donos de empresas por meio de cursos, soluções digitais e uma comunidade exclusiva por setor. Nossa metodologia combina diagnóstico, educação e soluções que visam melhorar decisões, processos e resultados.
                </p>
              </div>
              <div className="grid gap-5 md:grid-cols-3">
                {aboutPillars.map((pillar) => (
                  <div
                    key={pillar.title}
                    className="rounded-[8px] border border-[#E2E8F0] bg-white p-7 transition-shadow duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]"
                    style={{ borderTop: "3px solid #E8712B" }}
                  >
                    <pillar.icon className="h-8 w-8 text-[#E8712B]" />
                    <h3 className="mt-4 text-[20px] font-semibold text-[#1A1A2E]">{pillar.title}</h3>
                    <p className="mt-2 text-sm leading-[1.6] text-[#4A5568]">{pillar.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* NOSSOS PRODUTOS */}
        <section id="produtos" className="bg-white py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-12 max-w-2xl">
              <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-[#E8712B]">Nossos produtos</p>
              <h2 className="mt-3 text-4xl font-bold leading-[1.2] text-[#1A1A2E]">
                Cursos, ferramentas e experiências para cada momento da sua gestão.
              </h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {visibleProducts.map((product) => (
                <ProductCard key={product.name} product={product} />
              ))}
            </div>
          </div>
        </section>

        {/* COMUNIDADE */}
        <section id="comunidade" className="bg-[#0F1B33] py-24 text-white">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-12 max-w-2xl">
              <div className="mb-4 flex items-center gap-3">
                <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-[#E8712B]">Comunidade</p>
                <span className="rounded-[4px] bg-[#E8712B] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-white">
                  100% GRATUITO
                </span>
              </div>
              <h2 className="text-4xl font-bold leading-[1.2] text-white">
                Conecte-se com gestores do seu setor
              </h2>
              <p className="mt-5 text-[17px] leading-[1.7] text-white/70">
                Participe gratuitamente de comunidades exclusivas organizadas por setor de atuação. Troque experiências, tire dúvidas e compartilhe boas práticas com profissionais que enfrentam os mesmos desafios que você.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
              {communitySectors.map((sector) => (
                <div
                  key={sector.label}
                  className="flex flex-col items-center gap-3 rounded-[8px] border border-white/10 bg-white/[0.05] p-6 text-center transition-all duration-200 hover:border-[#E8712B]"
                >
                  <sector.icon className="h-7 w-7 text-[#E8712B]" />
                  <p className="font-semibold text-white">{sector.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 flex justify-center">
              <Link
                to="/entrar"
                className="inline-flex items-center gap-2 rounded-[6px] bg-[#E8712B] px-8 py-3.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#D4621F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8712B] focus-visible:ring-offset-2"
              >
                <Users className="h-4 w-4" />
                Participe da Comunidade
              </Link>
            </div>
          </div>
        </section>

        {/* COMO FUNCIONA */}
        <section id="como-funciona" className="bg-[#F7F8FA] py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-12 max-w-2xl">
              <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-[#E8712B]">Como funciona</p>
              <h2 className="mt-3 text-4xl font-bold leading-[1.2] text-[#1A1A2E]">
                Uma jornada simples para aprender, aplicar e evoluir.
              </h2>
            </div>
            <div className="relative">
              <div className="absolute left-[12.5%] right-[12.5%] top-6 hidden border-t border-dashed border-[#CBD5E0] md:block" />
              <div className="grid gap-8 md:grid-cols-4">
                {steps.map((step, index) => (
                  <div key={step} className="flex flex-col items-center gap-4 text-center">
                    <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-[#E8712B] bg-[#F7F8FA] text-lg font-bold text-[#E8712B]">
                      {index + 1}
                    </div>
                    <p className="text-base font-medium text-[#1A1A2E]">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="bg-[#1B2A4A] py-16">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex flex-col items-center gap-8 text-center md:flex-row md:justify-between md:text-left">
              <div>
                <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-white/60">Próximo passo</p>
                <h2 className="mt-2 max-w-xl text-[28px] font-semibold leading-[1.3] text-white">
                  Entre na plataforma, acesse sua comunidade e acompanhe sua evolução.
                </h2>
              </div>
              <Link
                to="/entrar"
                className="inline-flex shrink-0 items-center rounded-[6px] bg-[#E8712B] px-9 py-3.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#D4621F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8712B] focus-visible:ring-offset-2"
              >
                Acessar Minha Conta
              </Link>
            </div>
          </div>
        </section>

      </main>
      <SiteFooter />
    </div>
  );
}

type Product = (typeof products)[number];

function ProductCard({ product }: { product: Product }) {
  const content = (
    <div
      className={`flex h-full flex-col rounded-[8px] border border-[#E2E8F0] bg-[#F7F8FA] p-7 transition-all duration-200 ${
        product.href ? "hover:border-[#E8712B] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]" : ""
      }`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-[8px] bg-[#E8712B]/10">
        <product.icon className="h-6 w-6 text-[#E8712B]" />
      </div>
      <h3 className="mt-5 text-xl font-semibold text-[#1A1A2E]">{product.name}</h3>
      <p className="mt-2 text-base leading-[1.6] text-[#4A5568]">{product.text}</p>
      {product.cta ? (
        <span className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-semibold text-[#E8712B]">
          {product.cta}
          <ArrowRight className="h-4 w-4" />
        </span>
      ) : null}
    </div>
  );

  if (!product.href) return content;

  return (
    <Link
      to={product.href}
      className="block h-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8712B] focus-visible:ring-offset-2"
    >
      {content}
    </Link>
  );
}
