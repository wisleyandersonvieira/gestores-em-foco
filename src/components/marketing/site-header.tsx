import Link from "next/link";

import { Button } from "@/components/ui/button";

const navigation = [
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#pilares", label: "Pilares" },
  { href: "#depoimentos", label: "Resultados" },
  { href: "#faq", label: "FAQ" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-sm font-bold text-primary-foreground">
            GF
          </div>
          <div>
            <p className="font-display text-base font-semibold">Gestores em Foco</p>
            <p className="text-xs text-muted-foreground">Diagnosticos para crescimento empresarial</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground lg:flex">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-foreground">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link href="/cadastro">Criar conta</Link>
          </Button>
          <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Link href="/entrar">Acessar minha conta</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
