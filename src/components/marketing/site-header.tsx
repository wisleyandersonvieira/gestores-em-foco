import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import logo from "@/assets/logo-gestores-em-foco.png";

const navigation = [
  { href: "/", label: "Início" },
  { href: "/#produtos", label: "Produtos" },
  { href: "/#comunidade", label: "Comunidade" },
  { href: "/#quem-somos", label: "Sobre" },
  { href: "/#contato", label: "Contato" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 bg-white border-b border-[#E2E8F0] transition-shadow duration-200 ${
        scrolled ? "shadow-[0_1px_6px_rgba(0,0,0,0.08)]" : ""
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-[18px]">
        <Link to="/" className="flex items-center gap-3" aria-label="Gestores em Foco">
          <img src={logo} alt="Gestores em Foco — Educação e Comunidade para Gestores" className="h-10 w-auto" />
        </Link>

        <nav className="hidden items-center gap-7 text-[15px] font-medium lg:flex">
          {navigation.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-[#4A5568] transition-colors duration-200 hover:text-[#1B2A4A]"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 sm:flex">
          <Button
            asChild
            variant="outline"
            className="border-[#E8712B] bg-transparent text-[#E8712B] hover:bg-[#E8712B] hover:text-white transition-colors duration-200"
          >
            <Link to="/entrar">Entrar</Link>
          </Button>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-[#4A5568] hover:bg-[#F7F8FA] hover:text-[#1B2A4A] sm:hidden"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Abrir menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 bg-white border-l border-[#E2E8F0]">
            <div className="mt-8 grid gap-5">
              {navigation.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="text-base font-medium text-[#4A5568] transition-colors duration-200 hover:text-[#1B2A4A]"
                >
                  {item.label}
                </a>
              ))}
              <Button
                asChild
                className="mt-2 bg-[#E8712B] text-white hover:bg-[#D4621F] border-none"
              >
                <Link to="/entrar">Entrar</Link>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
