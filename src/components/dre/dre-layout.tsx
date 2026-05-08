import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { BarChart3, FilePlus2, Files, LayoutTemplate, ListTree, SearchCheck, UserCircle } from "lucide-react";
import type { User } from "@supabase/supabase-js";

import { ClientLayout } from "@/components/platform/client-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DRE_PRODUCT_KEY } from "@/lib/dre-calculations";
import { checkProductAccess } from "@/lib/product-access";
import { createDefaultDreCategories } from "@/lib/dre-service";

const dreNavigation = [
  { to: "/dre-facil", label: "Dashboard", icon: BarChart3 },
  { to: "/dre-facil/cadastrar", label: "Cadastrar DRE", icon: FilePlus2 },
  { to: "/dre-facil/dres", label: "DREs Cadastrados", icon: Files },
  { to: "/dre-facil/analise", label: "Analise de DRE", icon: SearchCheck },
  { to: "/dre-facil/modelos", label: "Modelos de DRE", icon: LayoutTemplate },
  { to: "/dre-facil/categorias", label: "Categorias e Subcategorias", icon: ListTree },
  { to: "/dre-facil/minha-conta", label: "Minha Conta", icon: UserCircle },
];

type DreLayoutProps = {
  children: (user: User) => React.ReactNode;
};

export function DreLayout({ children }: DreLayoutProps) {
  return (
    <ClientLayout>
      {(user) => <DreAccessGate user={user}>{children}</DreAccessGate>}
    </ClientLayout>
  );
}

function DreAccessGate({ user, children }: { user: User; children: (user: User) => React.ReactNode }) {
  const [accessState, setAccessState] = useState<"loading" | "allowed" | "blocked">("loading");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadAccess() {
      const access = await checkProductAccess(user.id, DRE_PRODUCT_KEY);
      if (!active) return;

      setNotice(access.error);
      setAccessState(access.hasAccess ? "allowed" : "blocked");

      if (access.hasAccess) {
        void createDefaultDreCategories(user.id).catch(() => undefined);
      }
    }

    void loadAccess();
    return () => {
      active = false;
    };
  }, [user.id]);

  if (accessState === "loading") {
    return <div className="text-sm text-muted-foreground">Verificando acesso ao Gestor de DRE...</div>;
  }

  if (accessState === "blocked") {
    return (
      <Card className="border-primary/10 bg-white/90">
        <CardContent className="flex flex-col gap-5 p-8 text-center sm:items-center">
          <Badge variant="outline" className="w-fit">Gestor de DRE</Badge>
          <div>
            <h1 className="font-display text-3xl font-semibold">Voce ainda nao possui assinatura ativa para este produto.</h1>
            <p className="mt-3 text-sm text-muted-foreground">Quando a assinatura estiver ativa, o acesso ao mini sistema sera liberado automaticamente.</p>
          </div>
          <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to="/#produtos">Ver planos disponiveis</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 rounded-xl border border-primary/10 bg-white/90 p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Gestor de DRE</p>
            <p className="text-sm text-muted-foreground">Controle mensal de categorias, modelos, lancamentos e indicadores.</p>
          </div>
          {notice ? <Badge variant="secondary">{notice}</Badge> : <Badge className="bg-emerald-600">Acesso ativo</Badge>}
        </div>
        <nav className="flex gap-2 overflow-x-auto pb-1">
          {dreNavigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/dre-facil"}
              className={({ isActive }) =>
                `inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium transition ${
                  isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {children(user)}
    </div>
  );
}
