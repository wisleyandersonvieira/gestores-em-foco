import { Link } from "react-router-dom";
import { Facebook, Instagram, Linkedin } from "lucide-react";

export function SiteFooter() {
  return (
    <footer id="contato" className="border-t border-border/70 bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
        <div>
          <p className="font-display text-lg font-semibold uppercase tracking-wide">Gestores em Foco</p>
          <p className="mt-2 max-w-xl text-sm text-primary-foreground/80">
            Mentoria Empresarial para Gestores e Donos de Empresas.
          </p>
        </div>
        <div className="grid gap-3 text-sm text-primary-foreground/80">
          <a href="#produtos" className="transition hover:text-white">Produtos</a>
          <a href="#quem-somos" className="transition hover:text-white">Quem somos</a>
          <Link to="/entrar" className="transition hover:text-white">Acessar conta</Link>
          <Link to="/termos-de-uso" className="transition hover:text-white">Termos de Uso</Link>
          <Link to="/politica-de-privacidade" className="transition hover:text-white">Politica de Privacidade</Link>
        </div>
        <div>
          <p className="text-sm font-semibold">Redes sociais</p>
          <div className="mt-4 flex gap-3">
            {[Instagram, Linkedin, Facebook].map((Icon, index) => (
              <a key={index} href="#" className="flex h-10 w-10 items-center justify-center rounded-full border border-primary-foreground/20 transition hover:bg-white/10">
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-primary-foreground/10 px-6 py-5 text-center text-xs text-primary-foreground/70">
        © 2026 Gestores em Foco. Todos os direitos reservados.
      </div>
    </footer>
  );
}
