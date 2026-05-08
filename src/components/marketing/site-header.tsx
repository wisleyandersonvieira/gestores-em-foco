import { Link } from "react-router-dom";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navigation = [
  { href: "/", label: "Inicio" },
  { href: "#produtos", label: "Produtos" },
  { href: "#quem-somos", label: "Sobre" },
  { href: "#contato", label: "Contato" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-sm font-bold text-primary-foreground">
            GF
          </div>
          <div>
            <p className="font-display text-base font-semibold uppercase tracking-wide">Gestores em Foco</p>
            <p className="text-xs text-muted-foreground">Mentoria Empresarial</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground lg:flex">
          {navigation.map((item) => (
            <a key={item.href} href={item.href} className="transition hover:text-foreground">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 sm:flex">
          <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to="/entrar">Entrar</Link>
          </Button>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="sm:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Abrir menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <div className="mt-8 grid gap-5">
              {navigation.map((item) => (
                <a key={item.href} href={item.href} className="text-base font-medium text-muted-foreground transition hover:text-foreground">
                  {item.label}
                </a>
              ))}
              <Button asChild className="mt-2 bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/entrar">Entrar</Link>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
