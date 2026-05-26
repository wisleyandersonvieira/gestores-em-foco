import { Link } from "react-router-dom";
import { Facebook, Instagram, Linkedin } from "lucide-react";
import logo from "@/assets/logo-gestores-em-foco.png";

const footerLinks = [
  { href: "/#produtos", label: "Produtos" },
  { href: "/#quem-somos", label: "Quem somos" },
  { href: "/#comunidade", label: "Comunidade" },
  { href: "/#como-funciona", label: "Como funciona" },
];

const accessLinks = [
  { to: "/entrar", label: "Acessar conta" },
  { to: "/termos-de-uso", label: "Termos de Uso" },
  { to: "/politica-de-privacidade", label: "Política de Privacidade" },
];

export function SiteFooter() {
  return (
    <footer id="contato" className="bg-[#0F1B33] text-white/70">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <img
            src={logo}
            alt="Gestores em Foco"
            className="h-9 w-auto brightness-0 invert"
            loading="lazy"
          />
          <p className="mt-4 text-sm leading-6 text-white/55">
            Educação e Comunidade para Gestores e Donos de Empresas.
          </p>
        </div>

        <div>
          <p className="mb-4 text-[13px] font-semibold uppercase tracking-[0.08em] text-white">Links úteis</p>
          <div className="grid gap-3 text-sm">
            {footerLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-white/55 transition-colors duration-200 hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-4 text-[13px] font-semibold uppercase tracking-[0.08em] text-white">Acesso</p>
          <div className="grid gap-3 text-sm">
            {accessLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="text-white/55 transition-colors duration-200 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-4 text-[13px] font-semibold uppercase tracking-[0.08em] text-white">Redes sociais</p>
          <div className="flex gap-3">
            {[Instagram, Linkedin, Facebook].map((Icon, index) => (
              <a
                key={index}
                href="#"
                aria-label="Rede social"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/55 transition-all duration-200 hover:border-white/40 hover:text-white"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-white/[0.08] px-6 py-5 text-center text-xs text-white/40">
        © 2026 Gestores em Foco. Todos os direitos reservados.
      </div>
    </footer>
  );
}
