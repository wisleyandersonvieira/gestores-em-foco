import { Link } from "react-router-dom";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-display text-lg font-semibold">Gestores em Foco</p>
          <p className="mt-2 max-w-xl text-sm text-primary-foreground/80">
            SaaS para mentores, coaches e organizadores transformarem diagnosticos em clareza, acao e crescimento.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-primary-foreground/80">
          <Link to="/entrar" className="transition hover:text-white">
            Acessar conta
          </Link>
          <Link to="/cadastro" className="transition hover:text-white">
            Criar conta
          </Link>
          <Link to="/admin" className="transition hover:text-white">
            Painel admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
